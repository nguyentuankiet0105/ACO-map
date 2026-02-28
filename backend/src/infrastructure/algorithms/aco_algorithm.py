"""
ACO Algorithm Implementation (Clean Architecture - Infrastructure Layer)
Implements IPathFinderAlgorithm interface
"""
import random
from typing import List, Dict, Any, Tuple
from ...domain.interfaces import IPathFinderAlgorithm
from ...domain.entities import Graph, Path


class AntColonyOptimization(IPathFinderAlgorithm):
    """
    ACO Algorithm implementing clean architecture principles
    SOLID - Single Responsibility: Only handles path optimization logic
    """

    def __init__(
        self,
        n_ants: int = 15,
        n_iterations: int = 30,
        alpha: float = 1.0,
        beta: float = 2.0,
        evaporation: float = 0.5
    ):
        self.n_ants = n_ants
        self.n_iterations = n_iterations
        self.alpha = alpha
        self.beta = beta
        self.evaporation = evaporation
        self.pheromone: Dict[Tuple[str, str], float] = {}
        self.iterations_history: List[Dict[str, Any]] = []

    def find_optimal_path(
        self,
        graph: Graph,
        start_node: str,
        end_node: str,
        blocked_edges: List[tuple] = None
    ) -> Path:
        """Find optimal path using ACO algorithm"""
        # Validate inputs
        if start_node not in graph.nodes:
            raise ValueError(f"Start node {start_node} not in graph")
        if end_node not in graph.nodes:
            raise ValueError(f"End node {end_node} not in graph")

        # Block edges if specified
        if blocked_edges:
            print(f"🚫 Blocking {len(blocked_edges)} edges: {blocked_edges}")
            for from_node, to_node in blocked_edges:
                graph.block_edge(from_node, to_node)
                print(f"   ✓ Blocked: {from_node} ↔ {to_node}")

        # Initialize pheromone
        self._initialize_pheromone(graph)

        # Run ACO algorithm
        best_path = None
        best_distance = float("inf")

        for iteration in range(self.n_iterations):
            iteration_paths = []

            for _ in range(self.n_ants):
                path, distance = self._construct_path(graph, start_node, end_node)
                if path and distance < float("inf"):
                    iteration_paths.append((path, distance))
                    if distance < best_distance:
                        best_path = path
                        best_distance = distance

            self._update_pheromone(iteration_paths)
            self._store_iteration_history(iteration, best_path, best_distance, iteration_paths)

        if best_path is None:
            return Path(nodes=[], distance=float('inf'))

        return Path(nodes=best_path, distance=best_distance)

    def _initialize_pheromone(self, graph: Graph) -> None:
        """Initialize pheromone levels on all edges (bidirectional)"""
        self.pheromone = {}
        for edge in graph.edges:
            if not edge.is_blocked:
                # Add pheromone for both directions (undirected graph)
                self.pheromone[(edge.from_node, edge.to_node)] = 1.0
                self.pheromone[(edge.to_node, edge.from_node)] = 1.0

    def _construct_path(
        self,
        graph: Graph,
        start: str,
        end: str
    ) -> Tuple[List[str], float]:
        """Construct a path for one ant"""
        current = start
        path = [current]
        distance = 0
        visited = {current}
        max_steps = 100

        for _ in range(max_steps):
            if current == end:
                break

            neighbors = graph.get_neighbors(current)
            unvisited_neighbors = [n for n in neighbors if n not in visited]

            if not unvisited_neighbors:
                # Try any neighbor to complete path
                unvisited_neighbors = neighbors
                if not unvisited_neighbors:
                    return None, float("inf")

            next_node = self._select_next_node(
                graph, current, unvisited_neighbors
            )

            path.append(next_node)
            distance += graph.get_edge_weight(current, next_node)
            visited.add(next_node)
            current = next_node

        if current != end:
            return None, float("inf")

        return path, distance

    def _select_next_node(
        self,
        graph: Graph,
        current: str,
        neighbors: List[str]
    ) -> str:
        """Select next node based on pheromone and heuristic"""
        probabilities = []

        for neighbor in neighbors:
            edge_key = (current, neighbor)
            pheromone = self.pheromone.get(edge_key, 1.0) ** self.alpha
            heuristic = (1.0 / graph.get_edge_weight(current, neighbor)) ** self.beta
            probabilities.append(pheromone * heuristic)

        total = sum(probabilities)
        if total == 0:
            return random.choice(neighbors)

        probabilities = [p / total for p in probabilities]
        return random.choices(neighbors, weights=probabilities)[0]

    def _update_pheromone(self, paths: List[Tuple[List[str], float]]) -> None:
        """Update pheromone levels"""
        # Evaporation
        for edge_key in self.pheromone:
            self.pheromone[edge_key] *= (1 - self.evaporation)

        # Reinforcement
        for path, distance in paths:
            if path and distance < float("inf"):
                for i in range(len(path) - 1):
                    edge_key = (path[i], path[i + 1])
                    if edge_key in self.pheromone:
                        self.pheromone[edge_key] += 1.0 / distance

    def _store_iteration_history(
        self,
        iteration: int,
        best_path: List[str],
        best_distance: float,
        paths: List[Tuple[List[str], float]]
    ) -> None:
        """Store iteration data for visualization"""
        self.iterations_history.append({
            "iteration": iteration + 1,
            "paths": [(path, dist) for path, dist in paths[:5]],
            "best_path": best_path,
            "best_distance": best_distance,
            "pheromone_levels": {
                str(edge): level
                for edge, level in list(self.pheromone.items())[:10]
            }
        })

    def get_iterations_history(self) -> List[Dict[str, Any]]:
        """Get iteration history for result"""
        return self.iterations_history
