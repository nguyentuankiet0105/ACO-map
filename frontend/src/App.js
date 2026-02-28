import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./App.css";

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
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const scale = 0.8;

  // Load graph structure on mount
  useEffect(() => {
    axios.get("http://localhost:5000/graph")
      .then(response => {
        const graphData = response.data;
        console.log("📊 Loaded graph:", graphData);

        // Convert lat/lng to x/y for canvas
        if (graphData.nodes) {
          const canvasWidth = 800;
          const canvasHeight = 600;

          // Get lat/lng ranges
          const lats = Object.values(graphData.nodes).map(n => n.lat);
          const lngs = Object.values(graphData.nodes).map(n => n.lng);
          const minLat = Math.min(...lats);
          const maxLat = Math.max(...lats);
          const minLng = Math.min(...lngs);
          const maxLng = Math.max(...lngs);

          console.log("🗺️ Lat range:", minLat, "to", maxLat);
          console.log("🗺️ Lng range:", minLng, "to", maxLng);

          // Convert each node to canvas coordinates
          Object.keys(graphData.nodes).forEach(nodeId => {
            const node = graphData.nodes[nodeId];
            const padding = 100;

            // Normalize to 0-1
            const normalizedX = (node.lng - minLng) / (maxLng - minLng || 1);
            const normalizedY = 1 - (node.lat - minLat) / (maxLat - minLat || 1); // Invert Y

            // Scale to canvas
            node.x = padding + normalizedX * (canvasWidth - 2 * padding);
            node.y = padding + normalizedY * (canvasHeight - 2 * padding);

            console.log(`📍 Node ${nodeId}: (${node.x}, ${node.y})`);
          });
        }

        setGraph(graphData);
      })
      .catch(error => console.error("❌ Error loading graph:", error));
  }, []);

  // Animation loop for ants
  useEffect(() => {
    if (isAnimating && ants.length > 0) {
      animationFrameRef.current = requestAnimationFrame(updateAnts);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isAnimating, ants]);

  // Draw graph on canvas
  useEffect(() => {
    if (graph && canvasRef.current) {
      drawGraph();
    }
  }, [graph, result, currentIteration, blockedEdges, ants, showPheromone]);

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

  const drawGraph = () => {
    const canvas = canvasRef.current;
    if (!canvas || !graph || !graph.edges || !graph.nodes) {
      if (!canvas) console.warn("⚠️ Canvas not ready");
      if (!graph) console.warn("⚠️ Graph not loaded");
      if (graph && !graph.edges) console.warn("⚠️ Graph edges missing:", graph);
      if (graph && !graph.nodes) console.warn("⚠️ Graph nodes missing:", graph);
      return;
    }

    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw pheromone trails (if enabled and animating)
    if (showPheromone && isAnimating && result && result.iterations) {
      graph.edges.forEach(edge => {
        const fromPos = graph.nodes[edge.from];
        const toPos = graph.nodes[edge.to];

        const x1 = fromPos.x * scale;
        const y1 = fromPos.y * scale;
        const x2 = toPos.x * scale;
        const y2 = toPos.y * scale;

        const pheromoneLevel = getPheromoneLevel(edge.from, edge.to);
        const maxPheromone = 10; // Normalize
        const opacity = Math.min(pheromoneLevel / maxPheromone, 0.8);

        // Draw pheromone glow
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = `rgba(255, 200, 0, ${opacity})`;
        ctx.lineWidth = 8;
        ctx.stroke();
      });
    }

    // Draw edges
    graph.edges.forEach(edge => {
      const fromPos = graph.nodes[edge.from];
      const toPos = graph.nodes[edge.to];

      const x1 = fromPos.x * scale;
      const y1 = fromPos.y * scale;
      const x2 = toPos.x * scale;
      const y2 = toPos.y * scale;

      // Check if edge is blocked
      const isBlocked = blockedEdges.some(
        blocked => (blocked[0] === edge.from && blocked[1] === edge.to) ||
          (blocked[0] === edge.to && blocked[1] === edge.from)
      );

      // Check if edge is in best path
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

      // Draw edge
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);

      if (isBlocked) {
        ctx.strokeStyle = "#f44336";
        ctx.lineWidth = 4;
        ctx.setLineDash([10, 5]);
      } else if (isInBestPath && !isAnimating) {
        // Animate best path with pulsing effect
        const pulse = Math.sin(Date.now() / 200) * 0.5 + 0.5;
        ctx.strokeStyle = `rgba(76, 175, 80, ${0.6 + pulse * 0.4})`;
        ctx.lineWidth = 6 + pulse * 2;
        ctx.setLineDash([]);

        // Add glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#4caf50";
      } else {
        ctx.strokeStyle = "#9e9e9e";
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
      }

      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;

      // Draw weight
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;

      ctx.fillStyle = "white";
      ctx.fillRect(midX - 15, midY - 12, 30, 24);
      ctx.fillStyle = isBlocked ? "#f44336" : "#333";
      ctx.font = "bold 14px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(edge.weight, midX, midY);
    });

    // Draw ants
    ants.forEach(ant => {
      const x = ant.x * scale;
      const y = ant.y * scale;

      // Ant body
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = "#000";
      ctx.fill();

      // Ant highlight
      ctx.beginPath();
      ctx.arc(x - 1, y - 1, 2, 0, 2 * Math.PI);
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.fill();

      // Ant trail
      if (ant.trail && ant.trail.length > 1) {
        ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ant.trail[0].x * scale, ant.trail[0].y * scale);
        for (let i = 1; i < ant.trail.length; i++) {
          ctx.lineTo(ant.trail[i].x * scale, ant.trail[i].y * scale);
        }
        ctx.stroke();
      }
    });

    // Draw nodes
    Object.entries(graph.nodes).forEach(([node, pos]) => {
      const x = pos.x * scale;
      const y = pos.y * scale;

      // Determine node color
      let fillColor = "#2196f3";
      if (node === start) fillColor = "#ff9800";
      else if (node === end) fillColor = "#e91e63";
      else if (result && result.best_path && result.best_path.includes(node) && !isAnimating) {
        fillColor = "#4caf50";
      }

      // Node glow for start and end
      if (node === start || node === end) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = fillColor;
      }

      // Draw node circle
      ctx.beginPath();
      ctx.arc(x, y, 25, 0, 2 * Math.PI);
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.shadowBlur = 0;

      // Draw node label
      ctx.fillStyle = "#fff";
      ctx.font = "bold 20px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(node, x, y);
    });

    // Draw info panel
    if (isAnimating && result && result.iterations && result.iterations[currentIteration]) {
      const iterData = result.iterations[currentIteration];

      // Background
      ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
      ctx.fillRect(10, 10, 280, 120);

      // Border
      ctx.strokeStyle = "#667eea";
      ctx.lineWidth = 2;
      ctx.strokeRect(10, 10, 280, 120);

      // Text
      ctx.fillStyle = "#fff";
      ctx.font = "bold 16px Arial";
      ctx.textAlign = "left";
      ctx.fillText(`🐜 Iteration: ${iterData.iteration}/${result.iterations.length}`, 20, 35);
      ctx.fillText(`📏 Best Distance: ${iterData.best_distance.toFixed(2)} km`, 20, 60);
      ctx.fillText(`🎯 Active Ants: ${ants.length}`, 20, 85);

      if (iterData.best_path) {
        ctx.font = "12px Arial";
        ctx.fillText(`Path: ${iterData.best_path.join(" → ")}`, 20, 110);
      }
    }
  };

  const createAntsForIteration = (iterationData) => {
    if (!iterationData || !iterationData.paths || !graph || !graph.nodes) return [];

    const newAnts = [];
    iterationData.paths.forEach((pathData, idx) => {
      const [path, distance] = pathData;
      if (path && path.length > 0) {
        const startPos = graph.nodes[path[0]];
        newAnts.push({
          id: idx,
          path: path,
          currentNodeIndex: 0,
          x: startPos.x,
          y: startPos.y,
          progress: 0,
          speed: 0.02 + Math.random() * 0.02,
          trail: [{ x: startPos.x, y: startPos.y }],
          distance: distance
        });
      }
    });

    return newAnts;
  };

  const updateAnts = () => {
    if (!graph || !graph.nodes) return;

    setAnts(prevAnts => {
      const updatedAnts = prevAnts.map(ant => {
        if (ant.currentNodeIndex >= ant.path.length - 1) {
          return null; // Ant reached destination
        }

        const currentNode = ant.path[ant.currentNodeIndex];
        const nextNode = ant.path[ant.currentNodeIndex + 1];
        const currentPos = graph.nodes[currentNode];
        const nextPos = graph.nodes[nextNode];

        if (!currentPos || !nextPos) return null;

        ant.progress += ant.speed;

        if (ant.progress >= 1) {
          ant.progress = 0;
          ant.currentNodeIndex++;
          if (ant.currentNodeIndex < ant.path.length - 1) {
            const newCurrentPos = graph.nodes[ant.path[ant.currentNodeIndex]];
            ant.trail.push({ x: newCurrentPos.x, y: newCurrentPos.y });
            if (ant.trail.length > 10) ant.trail.shift();
          }
        } else {
          ant.x = currentPos.x + (nextPos.x - currentPos.x) * ant.progress;
          ant.y = currentPos.y + (nextPos.y - currentPos.y) * ant.progress;
        }

        return ant;
      }).filter(ant => ant !== null);

      if (updatedAnts.length === 0) {
        // All ants finished, move to next iteration
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

    if (isAnimating) {
      animationFrameRef.current = requestAnimationFrame(updateAnts);
    }
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

      console.log("✅ Response received:", response.data);
      console.log("📊 Graph edges:", response.data.graph_edges);
      console.log("📍 Node positions:", response.data.node_positions);

      setResult(response.data);

      // Keep existing nodes with x/y, only update edges
      setGraph(prevGraph => {
        const newGraph = {
          edges: response.data.graph_edges || [],
          nodes: prevGraph?.nodes || response.data.node_positions || {}
        };
        console.log("🔄 Updated graph:", newGraph);
        return newGraph;
      });
    } catch (error) {
      console.error("❌ Error optimizing:", error);
      console.error("❌ Error response:", error.response?.data);
      alert(`Error finding optimal path: ${error.response?.data?.error || error.message}`);
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

  // Update ants when iteration changes
  useEffect(() => {
    if (isAnimating && result && result.iterations && result.iterations[currentIteration]) {
      const newAnts = createAntsForIteration(result.iterations[currentIteration]);
      setAnts(newAnts);
    }
  }, [currentIteration, isAnimating]);

  const availableNodes = graph ? Object.keys(graph.nodes) : [];

  return (
    <div className="app-container">
      <div className="header">
        <h1>🏔️ ACO Decision Support System</h1>
        <p>Ant Colony Optimization for Mountain Trekking & Disaster Route Planning</p>
      </div>

      <div className="main-content">
        <div className="control-panel">
          <h2>⚙️ Control Panel</h2>

          <div className="input-group">
            <label>🎯 Start Point</label>
            <select value={start} onChange={(e) => setStart(e.target.value)}>
              {availableNodes.map(node => (
                <option key={node} value={node}>{node}</option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label>🏁 End Point</label>
            <select value={end} onChange={(e) => setEnd(e.target.value)}>
              {availableNodes.map(node => (
                <option key={node} value={node}>{node}</option>
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
              <div className="legend-color" style={{ background: "rgba(255, 200, 0, 0.6)" }}></div>
              <span>Pheromone Trail</span>
            </div>
          </div>
        </div>

        <div className="visualization-panel">
          <h2>🗺️ Route Visualization</h2>
          <div className="canvas-container">
            <canvas
              ref={canvasRef}
              width={700}
              height={500}
            />
          </div>

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
        </div>
      )}
    </div>
  );
}

export default App;
