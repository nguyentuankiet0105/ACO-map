import React, { useState, useEffect, useRef, useCallback } from "react";
import { GoogleMap, LoadScript, Marker, Polyline, InfoWindow } from "@react-google-maps/api";
import axios from "axios";
import "./App.css";

// Google Maps API Key - Replace with your own key
// Get free key at: https://console.cloud.google.com/google/maps-apis
const GOOGLE_MAPS_API_KEY = "AIzaSyBeWO67_0mELE7ypblSbaX8zGG-sjlEsos";

const mapContainerStyle = {
  width: "100%",
  height: "500px",
  borderRadius: "10px"
};

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: true,
  streetViewControl: false,
  fullscreenControl: true,
};

function App() {
  const [start, setStart] = useState("A");
  const [end, setEnd] = useState("H");
  const [result, setResult] = useState(null);
  const [graph, setGraph] = useState(null);
  const [blockedEdges, setBlockedEdges] = useState([]);
  const [fromNode, setFromNode] = useState("");
  const [toNode, setToNode] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentIteration, setCurrentIteration] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [ants, setAnts] = useState([]);
  const [showPheromone, setShowPheromone] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 21.0285, lng: 105.8742 });
  const mapRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Load graph structure on mount
  useEffect(() => {
    axios.get("http://localhost:5000/graph")
      .then(response => {
        setGraph(response.data);
        // Set map center to first node
        if (response.data.nodes && Object.keys(response.data.nodes).length > 0) {
          const firstNode = Object.values(response.data.nodes)[0];
          setMapCenter({ lat: firstNode.lat, lng: firstNode.lng });
        }
      })
      .catch(error => console.error("Error loading graph:", error));
  }, []);

  // Animation loop for ants
  useEffect(() => {
    if (isAnimating && ants.length > 0) {
      const interval = setInterval(() => {
        updateAnts();
      }, 50);
      return () => clearInterval(interval);
    }
  }, [isAnimating, ants]);

  const getPheromoneLevel = (from, to) => {
    if (!result || !result.iterations || !result.iterations[currentIteration]) {
      return 1.0;
    }

    const iterData = result.iterations[currentIteration];
    const pheromones = iterData.pheromone_levels || {};

    const key1 = `('${from}', '${to}')`;
    const key2 = `('${to}', '${from}')`;

    return pheromones[key1] || pheromones[key2] || 1.0;
  };

  const createAntsForIteration = (iterationData) => {
    if (!iterationData || !iterationData.paths || !graph) return [];

    const newAnts = [];
    iterationData.paths.forEach((pathData, idx) => {
      const [path, distance] = pathData;
      if (path && path.length > 0) {
        const startPos = graph.nodes[path[0]];
        newAnts.push({
          id: idx,
          path: path,
          currentNodeIndex: 0,
          lat: startPos.lat,
          lng: startPos.lng,
          progress: 0,
          speed: 0.02 + Math.random() * 0.02,
          distance: distance
        });
      }
    });

    return newAnts;
  };

  const updateAnts = () => {
    setAnts(prevAnts => {
      const updatedAnts = prevAnts.map(ant => {
        if (ant.currentNodeIndex >= ant.path.length - 1) {
          return null;
        }

        const currentNode = ant.path[ant.currentNodeIndex];
        const nextNode = ant.path[ant.currentNodeIndex + 1];
        const currentPos = graph.nodes[currentNode];
        const nextPos = graph.nodes[nextNode];

        ant.progress += ant.speed;

        if (ant.progress >= 1) {
          ant.progress = 0;
          ant.currentNodeIndex++;
        } else {
          ant.lat = currentPos.lat + (nextPos.lat - currentPos.lat) * ant.progress;
          ant.lng = currentPos.lng + (nextPos.lng - currentPos.lng) * ant.progress;
        }

        return ant;
      }).filter(ant => ant !== null);

      if (updatedAnts.length === 0) {
        setTimeout(() => {
          if (currentIteration < result.iterations.length - 1) {
            setCurrentIteration(prev => prev + 1);
          } else {
            setIsAnimating(false);
          }
        }, 500);
      }

      return updatedAnts;
    });
  };

  const handleOptimize = async () => {
    setLoading(true);
    setResult(null);
    setCurrentIteration(0);
    setIsAnimating(false);
    setAnts([]);

    try {
      const response = await axios.post("http://localhost:5000/optimize", {
        start,
        end,
        blocked_edges: blockedEdges
      });
      setResult(response.data);
      setGraph({
        edges: response.data.graph_edges,
        nodes: response.data.node_positions
      });
    } catch (error) {
      console.error("Error optimizing:", error);
      alert("Error finding optimal path. Please check your inputs.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddBlockedEdge = () => {
    if (fromNode && toNode && fromNode !== toNode) {
      const newEdge = [fromNode, toNode];
      if (!blockedEdges.some(edge =>
        (edge[0] === fromNode && edge[1] === toNode) ||
        (edge[0] === toNode && edge[1] === fromNode))) {
        setBlockedEdges([...blockedEdges, newEdge]);
        setFromNode("");
        setToNode("");
      }
    }
  };

  const handleRemoveBlockedEdge = (index) => {
    setBlockedEdges(blockedEdges.filter((_, i) => i !== index));
  };

  const startAnimation = () => {
    if (result && result.iterations && result.iterations.length > 0) {
      setIsAnimating(true);
      setCurrentIteration(0);
      const firstIterAnts = createAntsForIteration(result.iterations[0]);
      setAnts(firstIterAnts);
    }
  };

  const stopAnimation = () => {
    setIsAnimating(false);
    setAnts([]);
  };

  useEffect(() => {
    if (isAnimating && result && result.iterations && result.iterations[currentIteration]) {
      const newAnts = createAntsForIteration(result.iterations[currentIteration]);
      setAnts(newAnts);
    }
  }, [currentIteration, isAnimating]);

  const availableNodes = graph ? Object.keys(graph.nodes) : [];

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  // Get edge color based on state
  const getEdgeColor = (edge) => {
    const isBlocked = blockedEdges.some(
      blocked => (blocked[0] === edge.from && blocked[1] === edge.to) ||
        (blocked[0] === edge.to && blocked[1] === edge.from)
    );

    if (isBlocked) return "#f44336";

    let isInBestPath = false;
    if (result && result.best_path) {
      for (let i = 0; i < result.best_path.length - 1; i++) {
        if ((result.best_path[i] === edge.from && result.best_path[i + 1] === edge.to) ||
          (result.best_path[i] === edge.to && result.best_path[i + 1] === edge.from)) {
          isInBestPath = true;
          break;
        }
      }
    }

    if (isInBestPath && !isAnimating) return "#4caf50";

    return "#9e9e9e";
  };

  const getEdgeOpacity = (edge) => {
    if (showPheromone && isAnimating) {
      const pheromoneLevel = getPheromoneLevel(edge.from, edge.to);
      return Math.min(pheromoneLevel / 10, 1.0);
    }
    return 1.0;
  };

  return (
    <div className="app-container">
      <div className="header">
        <h1>🏔️ ACO Decision Support System</h1>
        <p>Ant Colony Optimization for Mountain Trekking & Disaster Route Planning with Google Maps</p>
      </div>

      <div className="main-content">
        <div className="control-panel">
          <h2>⚙️ Control Panel</h2>

          <div className="input-group">
            <label>🎯 Start Point</label>
            <select value={start} onChange={(e) => setStart(e.target.value)}>
              {availableNodes.map(node => (
                <option key={node} value={node}>
                  {node} {graph?.nodes[node]?.name ? `- ${graph.nodes[node].name}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label>🏁 End Point</label>
            <select value={end} onChange={(e) => setEnd(e.target.value)}>
              {availableNodes.map(node => (
                <option key={node} value={node}>
                  {node} {graph?.nodes[node]?.name ? `- ${graph.nodes[node].name}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="blocked-edges-section">
            <h3>⚠️ Blocked Routes (Landslide/Disaster)</h3>
            <div className="edge-selector">
              <select value={fromNode} onChange={(e) => setFromNode(e.target.value)}>
                <option value="">From</option>
                {availableNodes.map(node => (
                  <option key={node} value={node}>{node}</option>
                ))}
              </select>
              <select value={toNode} onChange={(e) => setToNode(e.target.value)}>
                <option value="">To</option>
                {availableNodes.map(node => (
                  <option key={node} value={node}>{node}</option>
                ))}
              </select>
            </div>
            <button className="btn-add-block" onClick={handleAddBlockedEdge}>
              🚫 Block Route
            </button>

            {blockedEdges.length > 0 && (
              <ul className="blocked-list">
                {blockedEdges.map((edge, index) => (
                  <li key={index}>
                    {edge[0]} ↔ {edge[1]}
                    <button
                      className="btn-remove"
                      onClick={() => handleRemoveBlockedEdge(index)}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            className="btn-optimize"
            onClick={handleOptimize}
            disabled={loading}
          >
            {loading ? "🐜 Ants Searching..." : "🔍 Find Optimal Path"}
          </button>

          <div className="legend">
            <h3>Legend</h3>
            <div className="legend-item">
              <div className="legend-color" style={{ background: "#ff9800" }}></div>
              <span>Start Point</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ background: "#e91e63" }}></div>
              <span>End Point</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ background: "#4caf50" }}></div>
              <span>Optimal Path</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ background: "#f44336" }}></div>
              <span>Blocked Route</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ background: "#000" }}></div>
              <span>🐜 Ants</span>
            </div>
          </div>
        </div>

        <div className="visualization-panel">
          <h2>🗺️ Google Maps Visualization</h2>

          {GOOGLE_MAPS_API_KEY === "YOUR_API_KEY_HERE" && (
            <div className="error" style={{ marginBottom: "15px" }}>
              ⚠️ Please add your Google Maps API Key in App.js (line 9)
              <br />Get it free at: <a href="https://console.cloud.google.com/google/maps-apis" target="_blank" rel="noopener noreferrer">Google Cloud Console</a>
            </div>
          )}

          <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={mapCenter}
              zoom={13}
              onLoad={onMapLoad}
              options={mapOptions}
            >
              {/* Draw edges */}
              {graph && graph.edges && graph.edges.map((edge, idx) => {
                const fromPos = graph.nodes[edge.from];
                const toPos = graph.nodes[edge.to];
                const color = getEdgeColor(edge);
                const opacity = getEdgeOpacity(edge);
                const isBlocked = blockedEdges.some(
                  blocked => (blocked[0] === edge.from && blocked[1] === edge.to) ||
                    (blocked[0] === edge.to && blocked[1] === edge.from)
                );

                return (
                  <Polyline
                    key={`edge-${idx}`}
                    path={[
                      { lat: fromPos.lat, lng: fromPos.lng },
                      { lat: toPos.lat, lng: toPos.lng }
                    ]}
                    options={{
                      strokeColor: color,
                      strokeOpacity: opacity,
                      strokeWeight: color === "#4caf50" ? 6 : (isBlocked ? 4 : 3),
                      geodesic: true,
                      icons: isBlocked ? [{
                        icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 4 },
                        offset: '0',
                        repeat: '20px'
                      }] : []
                    }}
                  />
                );
              })}

              {/* Draw pheromone trails */}
              {showPheromone && isAnimating && graph && graph.edges && graph.edges.map((edge, idx) => {
                const fromPos = graph.nodes[edge.from];
                const toPos = graph.nodes[edge.to];
                const pheromoneLevel = getPheromoneLevel(edge.from, edge.to);
                const opacity = Math.min(pheromoneLevel / 10, 0.8);

                return (
                  <Polyline
                    key={`pheromone-${idx}`}
                    path={[
                      { lat: fromPos.lat, lng: fromPos.lng },
                      { lat: toPos.lat, lng: toPos.lng }
                    ]}
                    options={{
                      strokeColor: "#FFC800",
                      strokeOpacity: opacity,
                      strokeWeight: 8,
                      geodesic: true,
                      zIndex: 1
                    }}
                  />
                );
              })}

              {/* Draw nodes */}
              {graph && graph.nodes && Object.entries(graph.nodes).map(([nodeName, nodeData]) => {
                let iconColor = "#2196f3";
                if (nodeName === start) iconColor = "#ff9800";
                else if (nodeName === end) iconColor = "#e91e63";
                else if (result && result.best_path && result.best_path.includes(nodeName) && !isAnimating) {
                  iconColor = "#4caf50";
                }

                return (
                  <Marker
                    key={nodeName}
                    position={{ lat: nodeData.lat, lng: nodeData.lng }}
                    onClick={() => setSelectedNode(nodeName)}
                    icon={{
                      path: window.google?.maps?.SymbolPath?.CIRCLE || 0,
                      fillColor: iconColor,
                      fillOpacity: 1,
                      strokeColor: "#ffffff",
                      strokeWeight: 3,
                      scale: 12,
                    }}
                    label={{
                      text: nodeName,
                      color: "#ffffff",
                      fontSize: "14px",
                      fontWeight: "bold"
                    }}
                  />
                );
              })}

              {/* Show info window for selected node */}
              {selectedNode && graph && graph.nodes[selectedNode] && (
                <InfoWindow
                  position={{
                    lat: graph.nodes[selectedNode].lat,
                    lng: graph.nodes[selectedNode].lng
                  }}
                  onCloseClick={() => setSelectedNode(null)}
                >
                  <div>
                    <h3 style={{ margin: "0 0 5px 0", color: "#333" }}>Node {selectedNode}</h3>
                    <p style={{ margin: "0", color: "#666" }}>{graph.nodes[selectedNode].name}</p>
                    <p style={{ margin: "5px 0 0 0", fontSize: "12px", color: "#999" }}>
                      {graph.nodes[selectedNode].lat.toFixed(4)}, {graph.nodes[selectedNode].lng.toFixed(4)}
                    </p>
                  </div>
                </InfoWindow>
              )}

              {/* Draw ants */}
              {ants.map(ant => (
                <Marker
                  key={`ant-${ant.id}`}
                  position={{ lat: ant.lat, lng: ant.lng }}
                  icon={{
                    path: window.google?.maps?.SymbolPath?.CIRCLE || 0,
                    fillColor: "#000000",
                    fillOpacity: 1,
                    strokeColor: "#ffffff",
                    strokeWeight: 1,
                    scale: 5,
                  }}
                  zIndex={1000}
                />
              ))}
            </GoogleMap>
          </LoadScript>

          {result && (
            <div className="animation-controls">
              <button
                className="btn-control"
                onClick={isAnimating ? stopAnimation : startAnimation}
              >
                {isAnimating ? "⏸️ Stop Animation" : "▶️ Animate Process"}
              </button>

              <label style={{ marginLeft: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={showPheromone}
                  onChange={(e) => setShowPheromone(e.target.checked)}
                />
                Show Pheromone Trails
              </label>

              {isAnimating && (
                <span className="iteration-display">
                  Iteration: {currentIteration + 1} / {result.iterations.length}
                </span>
              )}
            </div>
          )}

          {isAnimating && result && result.iterations && result.iterations[currentIteration] && (
            <div className="result-item" style={{ marginTop: "15px" }}>
              <h3>🐜 Current Iteration Details</h3>
              <p>Iteration: {result.iterations[currentIteration].iteration}/{result.iterations.length}</p>
              <p>Best Distance: {result.iterations[currentIteration].best_distance.toFixed(2)} km</p>
              <p>Active Ants: {ants.length}</p>
            </div>
          )}
        </div>
      </div>

      {result && (
        <div className="results-panel">
          <h2>📊 Optimization Results</h2>

          <div className="result-item">
            <h3>🛤️ Optimal Path Found</h3>
            <div className="path-display">
              {result.best_path ? result.best_path.join(" → ") : "No path found"}
            </div>
          </div>

          <div className="result-item">
            <h3>📏 Total Distance</h3>
            <div className="distance-display">
              {result.distance ? result.distance.toFixed(2) : "∞"} km
            </div>
          </div>

          <div className="result-item">
            <h3>🐜 Algorithm Statistics</h3>
            <p>Total Iterations: {result.iterations ? result.iterations.length : 0}</p>
            <p>Ants per Iteration: 15</p>
            <p>Status: {result.best_path ? "✅ Path Found" : "❌ No Path Available"}</p>
          </div>

          {result.best_path && graph && (
            <div className="result-item">
              <h3>📍 Route Details</h3>
              {result.best_path.map((node, idx) => (
                <div key={idx} style={{ marginBottom: "8px", padding: "8px", background: "#f5f5f5", borderRadius: "6px" }}>
                  <strong>{idx + 1}. {node}</strong> - {graph.nodes[node]?.name || 'Unknown'}
                  <br />
                  <small style={{ color: "#666" }}>
                    {graph.nodes[node]?.lat.toFixed(4)}, {graph.nodes[node]?.lng.toFixed(4)}
                  </small>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
