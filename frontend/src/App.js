import React, { useState, useEffect, useRef, useCallback } from "react";
import { GoogleMap, LoadScript, Marker, Polyline, InfoWindow, DirectionsRenderer } from "@react-google-maps/api";
import axios from "axios";
import "./App.css";

// Google Maps API Key - Replace with your own key
// Get free key at: https://console.cloud.google.com/google/maps-apis
const GOOGLE_MAPS_API_KEY = "AIzaSyBeWO67_0mELE7ypblSbaX8zGG-sjlEsos";

// Libraries to load
const libraries = ["places"];

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
  const [showAllPaths, setShowAllPaths] = useState(false); // Toggle all paths vs best path only
  const [selectedNode, setSelectedNode] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 21.0285, lng: 105.8742 });
  const [edgeDirections, setEdgeDirections] = useState({});
  const [loadingRoads, setLoadingRoads] = useState(false);
  const [selectMode, setSelectMode] = useState(null); // 'start' or 'end' or null
  const [useRealRoads, setUseRealRoads] = useState(false); // Toggle for real roads vs straight lines
  const [addNodeMode, setAddNodeMode] = useState(false); // Mode for adding new nodes
  const [newNodeName, setNewNodeName] = useState(""); // Name for new node
  const [showNodeManager, setShowNodeManager] = useState(false); // Show node management panel
  const mapRef = useRef(null);
  const animationFrameRef = useRef(null);
  const directionsServiceRef = useRef(null);

  // Load graph structure on mount
  useEffect(() => {
    axios.get("http://localhost:5000/graph")
      .then(response => {
        // Parse response if it's a string
        const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
        setGraph(data);
        // Set map center to first node
        if (data.nodes && Object.keys(data.nodes).length > 0) {
          const firstNode = Object.values(data.nodes)[0];
          setMapCenter({ lat: firstNode.lat, lng: firstNode.lng });
        }
      })
      .catch(error => {
        console.error("❌ Error loading graph:", error);
        alert("Failed to load graph. Please ensure backend is running.");
      });
  }, []);

  // Animation loop for ants
  useEffect(() => {
    if (isAnimating && ants.length > 0) {
      const interval = setInterval(() => {
        updateAnts();
      }, 30);
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

    // If showAllPaths is false, only show the best path (first path which is the best)
    const pathsToShow = showAllPaths ? iterationData.paths : [iterationData.paths[0]];

    pathsToShow.forEach((pathData, idx) => {
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
          speed: 0.05 + Math.random() * 0.05,
          distance: distance,
          isBest: idx === 0 // First path is always the best
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

        // Get real road path between current and next node
        const edgeKey = `${currentNode}-${nextNode}`;
        const roadPath = edgeDirections[edgeKey];

        if (roadPath && roadPath.length > 1) {
          // Calculate position along road path
          const totalSegments = roadPath.length - 1;
          const segmentIndex = Math.floor(ant.progress * totalSegments);
          const segmentProgress = (ant.progress * totalSegments) - segmentIndex;

          const currentSegment = roadPath[Math.min(segmentIndex, totalSegments)];
          const nextSegment = roadPath[Math.min(segmentIndex + 1, totalSegments)];

          // Interpolate position along road segment
          ant.lat = currentSegment.lat + (nextSegment.lat - currentSegment.lat) * segmentProgress;
          ant.lng = currentSegment.lng + (nextSegment.lng - currentSegment.lng) * segmentProgress;
        } else {
          // Fallback to straight line
          const currentPos = graph.nodes[currentNode];
          const nextPos = graph.nodes[nextNode];
          ant.lat = currentPos.lat + (nextPos.lat - currentPos.lat) * ant.progress;
          ant.lng = currentPos.lng + (nextPos.lng - currentPos.lng) * ant.progress;
        }

        ant.progress += ant.speed;

        if (ant.progress >= 1) {
          ant.progress = 0;
          ant.currentNodeIndex++;
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
        }, 200);
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
      }, {
        timeout: 30000, // 30 seconds timeout
        maxContentLength: 10 * 1024 * 1024, // 10MB max
        maxBodyLength: 10 * 1024 * 1024 // 10MB max
      });

      // Parse response if it's a string, handling Infinity values
      let data;
      if (typeof response.data === 'string') {
        // Replace Infinity with a large number or null to make it valid JSON
        const cleanedData = response.data.replace(/:\s*Infinity\s*([,}])/g, ': 999999$1');
        data = JSON.parse(cleanedData);
      } else {
        data = response.data;
      }

      // Validate required fields
      if (!data.best_path || !Array.isArray(data.best_path)) {
        throw new Error("Invalid response: best_path is missing or not an array");
      }

      setResult(data);

      // Update graph - prioritize existing nodes, then use response nodes
      setGraph(prevGraph => {
        const updatedGraph = {
          edges: data.graph_edges || prevGraph?.edges || [],
          nodes: prevGraph?.nodes || data.node_positions || {}
        };
        return updatedGraph;
      });
    } catch (error) {
      console.error("❌ Error optimizing:", error);
      console.error("❌ Error message:", error.message);
      console.error("❌ Error response:", error.response?.data);
      console.error("❌ Error status:", error.response?.status);

      let errorMsg = "Unknown error";

      // Handle different error types
      if (error.response?.data?.error) {
        errorMsg = error.response.data.error;
      } else if (error.message.includes("JSON")) {
        errorMsg = "Failed to parse server response. Please try again.";
      } else if (error.message) {
        errorMsg = error.message;
      }

      alert(`Error finding optimal path: ${errorMsg}`);
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
        const newBlockedEdges = [...blockedEdges, newEdge];
        setBlockedEdges(newBlockedEdges);
        setFromNode("");
        setToNode("");

        // Auto re-optimize if we already have a result
        if (result && start && end) {
          setTimeout(() => handleOptimize(), 100);
        }
      }
    }
  };

  const handleRemoveBlockedEdge = (index) => {
    const newBlockedEdges = blockedEdges.filter((_, i) => i !== index);
    setBlockedEdges(newBlockedEdges);

    // Auto re-optimize if we already have a result
    if (result && start && end) {
      setTimeout(() => handleOptimize(), 100);
    }
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

  const availableNodes = (graph && graph.nodes) ? Object.keys(graph.nodes) : [];

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
    // Initialize directions service when map loads
    if (window.google && window.google.maps) {
      directionsServiceRef.current = new window.google.maps.DirectionsService();
    }
  }, []);

  // Fetch real road directions for all edges
  useEffect(() => {
    if (!useRealRoads) {
      return;
    }

    if (!graph || !graph.edges || !directionsServiceRef.current) {
      return;
    }

    // Skip if we already have directions for all edges
    const hasAllDirections = graph.edges.every(edge => {
      const edgeKey = `${edge.from}-${edge.to}`;
      return edgeDirections[edgeKey] !== undefined;
    });

    if (hasAllDirections) {
      return;
    }

    setLoadingRoads(true);

    const fetchDirections = async () => {
      const directions = { ...edgeDirections }; // Keep existing directions
      let successCount = 0;
      let fallbackCount = 0;

      for (const edge of graph.edges) {
        const edgeKey = `${edge.from}-${edge.to}`;

        // Skip if already have this direction
        if (directions[edgeKey]) {
          continue;
        }

        const fromPos = graph.nodes[edge.from];
        const toPos = graph.nodes[edge.to];

        try {
          const result = await new Promise((resolve, reject) => {
            directionsServiceRef.current.route(
              {
                origin: { lat: fromPos.lat, lng: fromPos.lng },
                destination: { lat: toPos.lat, lng: toPos.lng },
                travelMode: window.google.maps.TravelMode.DRIVING,
              },
              (result, status) => {
                if (status === "OK") {
                  resolve(result);
                } else {
                  // Fallback to walking if driving not available
                  directionsServiceRef.current.route(
                    {
                      origin: { lat: fromPos.lat, lng: fromPos.lng },
                      destination: { lat: toPos.lat, lng: toPos.lng },
                      travelMode: window.google.maps.TravelMode.WALKING,
                    },
                    (result2, status2) => {
                      if (status2 === "OK") {
                        resolve(result2);
                      } else {
                        reject({ status: status2, mode: 'WALKING' });
                      }
                    }
                  );
                }
              }
            );
          });

          // Extract path from directions
          const path = result.routes[0].overview_path.map(point => ({
            lat: point.lat(),
            lng: point.lng()
          }));

          directions[edgeKey] = path;
          directions[`${edge.to}-${edge.from}`] = [...path].reverse(); // Reverse for opposite direction

          successCount++;

          // Small delay to avoid API rate limits
          await new Promise(resolve => setTimeout(resolve, 150));
        } catch (error) {
          // Fallback to straight line
          directions[edgeKey] = [
            { lat: fromPos.lat, lng: fromPos.lng },
            { lat: toPos.lat, lng: toPos.lng }
          ];
          directions[`${edge.to}-${edge.from}`] = [
            { lat: toPos.lat, lng: toPos.lng },
            { lat: fromPos.lat, lng: fromPos.lng }
          ];
          fallbackCount++;
        }
      }

      setEdgeDirections(directions);
      setLoadingRoads(false);
    };

    fetchDirections();
  }, [graph]);

  // Get edge color based on state
  const getEdgeColor = (edge) => {
    // Check both frontend blockedEdges state and backend is_blocked flag
    const isBlockedByUser = blockedEdges.some(
      blocked => (blocked[0] === edge.from && blocked[1] === edge.to) ||
        (blocked[0] === edge.to && blocked[1] === edge.from)
    );

    const isBlockedByBackend = edge.is_blocked === true;

    if (isBlockedByUser || isBlockedByBackend) {
      return "#f44336"; // Red for blocked
    }

    let isInBestPath = false;
    if (result && result.best_path && Array.isArray(result.best_path)) {
      for (let i = 0; i < result.best_path.length - 1; i++) {
        if ((result.best_path[i] === edge.from && result.best_path[i + 1] === edge.to) ||
          (result.best_path[i] === edge.to && result.best_path[i + 1] === edge.from)) {
          isInBestPath = true;
          break;
        }
      }
    }

    // Show green path when not animating
    if (isInBestPath && !isAnimating) {
      return "#4caf50"; // Green for best path
    }

    return "#9e9e9e"; // Gray for regular edges
  };

  const getEdgeOpacity = (edge) => {
    if (showPheromone && isAnimating) {
      const pheromoneLevel = getPheromoneLevel(edge.from, edge.to);
      return Math.min(pheromoneLevel / 10, 1.0);
    }
    return 1.0;
  };

  // Add new node by clicking on map
  const handleMapClick = async (e) => {
    // Only process if in add node mode
    if (!addNodeMode || !newNodeName) {
      return;
    }

    const lat = e.latLng.lat();
    const lng = e.latLng.lng();

    // Generate node ID (next available letter)
    const existingIds = graph ? Object.keys(graph.nodes) : [];
    let newId = String.fromCharCode(65); // Start with 'A'
    while (existingIds.includes(newId)) {
      newId = String.fromCharCode(newId.charCodeAt(0) + 1);
    }

    try {
      const response = await axios.post("http://localhost:5000/nodes", {
        id: newId,
        lat: lat,
        lng: lng,
        name: newNodeName
      });

      // Reload graph
      const graphResponse = await axios.get("http://localhost:5000/graph");
      const parsedData = typeof graphResponse.data === 'string'
        ? JSON.parse(graphResponse.data)
        : graphResponse.data;
      setGraph(parsedData);

      setNewNodeName("");
      setAddNodeMode(false);
      alert(`Node ${newId} added: ${newNodeName}`);
    } catch (error) {
      console.error("Error adding node:", error);
      alert("Failed to add node: " + (error.response?.data?.error || error.message));
    }
  };

  // Remove a node
  const handleRemoveNode = async (nodeId) => {
    if (!window.confirm(`Remove node ${nodeId}? This will also remove all connected edges.`)) {
      return;
    }

    try {
      await axios.delete(`http://localhost:5000/nodes/${nodeId}`);

      // Reload graph
      const graphResponse = await axios.get("http://localhost:5000/graph");
      const parsedData = typeof graphResponse.data === 'string'
        ? JSON.parse(graphResponse.data)
        : graphResponse.data;
      setGraph(parsedData);

      // Clear selections if removed node was selected
      if (start === nodeId) setStart(availableNodes[0] || "");
      if (end === nodeId) setEnd(availableNodes[0] || "");

      alert(`Node ${nodeId} removed successfully`);
    } catch (error) {
      console.error("Error removing node:", error);
      alert("Failed to remove node: " + (error.response?.data?.error || error.message));
    }
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
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <select value={start} onChange={(e) => setStart(e.target.value)} style={{ flex: 1 }}>
                {availableNodes.map(node => (
                  <option key={node} value={node}>
                    {node} {graph?.nodes[node]?.name ? `- ${graph.nodes[node].name}` : ''}
                  </option>
                ))}
              </select>
              <button
                className={selectMode === 'start' ? "btn-select-active" : "btn-select"}
                onClick={() => setSelectMode(selectMode === 'start' ? null : 'start')}
                title="Click on map to select start node"
              >
                {selectMode === 'start' ? '✓ Click on Map' : '🖱️'}
              </button>
            </div>
          </div>

          <div className="input-group">
            <label>🏁 End Point</label>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <select value={end} onChange={(e) => setEnd(e.target.value)} style={{ flex: 1 }}>
                {availableNodes.map(node => (
                  <option key={node} value={node}>
                    {node} {graph?.nodes[node]?.name ? `- ${graph.nodes[node].name}` : ''}
                  </option>
                ))}
              </select>
              <button
                className={selectMode === 'end' ? "btn-select-active" : "btn-select"}
                onClick={() => setSelectMode(selectMode === 'end' ? null : 'end')}
                title="Click on map to select end node"
              >
                {selectMode === 'end' ? '✓ Click on Map' : '🖱️'}
              </button>
            </div>
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
              <div className="legend-color" style={{ background: "#4caf50" }}></div>
              <span>🐜 Best Path Ant (Animation)</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ background: "#000" }}></div>
              <span>🐜 Other Ants (Animation)</span>
            </div>
          </div>

          <div style={{ marginTop: "15px", padding: "15px", background: "#f5f5f5", borderRadius: "10px" }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={useRealRoads}
                onChange={(e) => {
                  setUseRealRoads(e.target.checked);
                  if (!e.target.checked) {
                    setEdgeDirections({}); // Clear cached directions
                  }
                }}
              />
              <span style={{ fontSize: "0.9em" }}>
                🛣️ Use Real Roads (Google Directions API)
                <br />
                <small style={{ color: "#666" }}>
                  ⚠️ Note: Mountain trails may not have road data
                </small>
              </span>
            </label>
          </div>

          <div style={{ marginTop: "15px" }}>
            <button
              className={showNodeManager ? "btn-select-active" : "btn-select"}
              onClick={() => setShowNodeManager(!showNodeManager)}
              style={{ width: "100%", padding: "10px" }}
            >
              {showNodeManager ? "📍 Hide Node Manager" : "📍 Manage Nodes (Dynamic)"}
            </button>

            {showNodeManager && (
              <div style={{ marginTop: "10px", padding: "15px", background: "#e3f2fd", borderRadius: "10px" }}>
                <h4 style={{ margin: "0 0 10px 0" }}>🆕 Add New Node</h4>
                <input
                  type="text"
                  placeholder="Enter location name..."
                  value={newNodeName}
                  onChange={(e) => setNewNodeName(e.target.value)}
                  style={{ width: "100%", padding: "8px", marginBottom: "8px", borderRadius: "5px", border: "1px solid #ccc" }}
                />
                <button
                  className={addNodeMode ? "btn-select-active" : "btn-add-block"}
                  onClick={() => {
                    if (newNodeName) {
                      setAddNodeMode(!addNodeMode);
                    } else {
                      alert("Please enter a location name first");
                    }
                  }}
                  style={{ width: "100%", marginBottom: "10px" }}
                >
                  {addNodeMode ? "✓ Click on Map to Add" : "📍 Start Adding Node"}
                </button>

                <h4 style={{ margin: "15px 0 10px 0" }}>🗑️ Remove Nodes</h4>
                <div style={{ maxHeight: "150px", overflowY: "auto" }}>
                  {availableNodes.map(nodeId => (
                    <div key={nodeId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px", background: "white", marginBottom: "5px", borderRadius: "5px" }}>
                      <span>{nodeId} - {graph?.nodes[nodeId]?.name}</span>
                      <button
                        className="btn-remove"
                        onClick={() => handleRemoveNode(nodeId)}
                        style={{ padding: "2px 8px" }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <p style={{ margin: "10px 0 0 0", fontSize: "0.85em", color: "#666" }}>
                  💡 Tip: Click on the map to add nodes at any location!
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="visualization-panel">
          <h2>🗺️ Google Maps Visualization</h2>

          {addNodeMode && (
            <div className="info" style={{ marginBottom: "15px", background: "#4caf50", color: "white", padding: "10px", borderRadius: "5px" }}>
              📍 Click on the map to add: <strong>{newNodeName}</strong>
            </div>
          )}

          {loadingRoads && (
            <div className="info" style={{ marginBottom: "15px", background: "#2196f3", color: "white", padding: "10px", borderRadius: "5px" }}>
              🔄 Loading real road paths from Google Maps... ({Object.keys(edgeDirections).length / 2} / {graph?.edges?.length || 0} edges)
            </div>
          )}

          {GOOGLE_MAPS_API_KEY === "YOUR_API_KEY_HERE" && (
            <div className="error" style={{ marginBottom: "15px" }}>
              ⚠️ Please add your Google Maps API Key in App.js (line 9)
              <br />Get it free at: <a href="https://console.cloud.google.com/google/maps-apis" target="_blank" rel="noopener noreferrer">Google Cloud Console</a>
            </div>
          )}

          <LoadScript
            googleMapsApiKey={GOOGLE_MAPS_API_KEY}
            libraries={libraries}
          >
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={mapCenter}
              zoom={13}
              onLoad={onMapLoad}
              options={{
                ...mapOptions,
                clickableIcons: false,
                draggableCursor: addNodeMode ? 'crosshair' : 'default',
              }}
              onClick={handleMapClick}
            >
              {/* Draw edges using real road paths */}
              {graph && graph.edges && graph.edges.map((edge, idx) => {
                const edgeKey = `${edge.from}-${edge.to}`;
                const path = edgeDirections[edgeKey] || [
                  { lat: graph.nodes[edge.from].lat, lng: graph.nodes[edge.from].lng },
                  { lat: graph.nodes[edge.to].lat, lng: graph.nodes[edge.to].lng }
                ];

                const color = getEdgeColor(edge);
                const opacity = getEdgeOpacity(edge);
                const isBlockedByUser = blockedEdges.some(
                  blocked => (blocked[0] === edge.from && blocked[1] === edge.to) ||
                    (blocked[0] === edge.to && blocked[1] === edge.from)
                );
                const isBlocked = isBlockedByUser || edge.is_blocked === true;

                return (
                  <Polyline
                    key={`edge-${idx}`}
                    path={path}
                    options={{
                      strokeColor: color,
                      strokeOpacity: opacity,
                      strokeWeight: color === "#4caf50" ? 6 : (isBlocked ? 5 : 3),
                      geodesic: false,
                      icons: isBlocked ? [{
                        icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 4 },
                        offset: '0',
                        repeat: '20px'
                      }] : [],
                      zIndex: isBlocked ? 10 : (color === "#4caf50" ? 5 : 1)
                    }}
                  />
                );
              })}

              {/* Draw pheromone trails using real roads */}
              {showPheromone && isAnimating && graph && graph.edges && graph.edges.map((edge, idx) => {
                const edgeKey = `${edge.from}-${edge.to}`;
                const path = edgeDirections[edgeKey] || [
                  { lat: graph.nodes[edge.from].lat, lng: graph.nodes[edge.from].lng },
                  { lat: graph.nodes[edge.to].lat, lng: graph.nodes[edge.to].lng }
                ];
                const pheromoneLevel = getPheromoneLevel(edge.from, edge.to);
                const opacity = Math.min(pheromoneLevel / 10, 0.8);

                return (
                  <Polyline
                    key={`pheromone-${idx}`}
                    path={path}
                    options={{
                      strokeColor: "#FFC800",
                      strokeOpacity: opacity,
                      strokeWeight: 8,
                      geodesic: false,
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
                const handleNodeClick = (e) => {
                  // Prevent map click event from firing
                  if (e) {
                    e.stop();
                  }

                  if (selectMode === 'start') {
                    setStart(nodeName);
                    setSelectMode(null);
                  } else if (selectMode === 'end') {
                    setEnd(nodeName);
                    setSelectMode(null);
                  } else {
                    setSelectedNode(nodeName);
                  }
                };

                return (
                  <Marker
                    key={nodeName}
                    position={{ lat: nodeData.lat, lng: nodeData.lng }}
                    onClick={handleNodeClick}
                    icon={{
                      path: window.google?.maps?.SymbolPath?.CIRCLE || 0,
                      fillColor: iconColor,
                      fillOpacity: 1,
                      strokeColor: selectMode ? "#00ff00" : "#ffffff",
                      strokeWeight: selectMode ? 5 : 3,
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
                    fillColor: ant.isBest ? "#4caf50" : "#000000",
                    fillOpacity: 1,
                    strokeColor: "#ffffff",
                    strokeWeight: 1,
                    scale: ant.isBest ? 6 : 5,
                  }}
                  zIndex={ant.isBest ? 2000 : 1000}
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

              <label style={{ marginLeft: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={showAllPaths}
                  onChange={(e) => setShowAllPaths(e.target.checked)}
                  disabled={!isAnimating}
                />
                <span style={{ color: !isAnimating ? '#999' : 'inherit' }}>
                  Show All Ant Paths
                  <br />
                  <small style={{ fontSize: '0.85em', color: '#666' }}>
                    (unchecked = best path only)
                  </small>
                </span>
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
              <p>Best Distance This Iteration: {result.iterations[currentIteration].best_distance.toFixed(2)} km</p>
              <p>Active Ants: {showAllPaths ? ants.length : '1 (Best Path Only)'}</p>
              {result.iterations[currentIteration].paths && result.iterations[currentIteration].paths[0] && (
                <p style={{ fontSize: '0.9em', color: '#666' }}>
                  Best Path: {result.iterations[currentIteration].paths[0][0].join(' → ')}
                </p>
              )}
            </div>
          )}
        </div>
      </div >

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
      )
      }
    </div >
  );
}

export default App;
