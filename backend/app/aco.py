
import random
import math

class AntColonyOptimization:
    def __init__(self, graph, n_ants=10, n_iterations=20, alpha=1, beta=2, evaporation=0.5, blocked_edges=None):
        self.graph = graph
        self.pheromone = {edge: 1.0 for edge in graph}
        self.n_ants = n_ants
        self.n_iterations = n_iterations
        self.alpha = alpha
        self.beta = beta
        self.evaporation = evaporation
        self.blocked_edges = blocked_edges or []

    def run(self, start, end):
        best_path = None
        best_distance = float("inf")
        iterations_history = []

        for iteration in range(self.n_iterations):
            all_paths = []

            for ant_id in range(self.n_ants):
                path, distance = self.construct_path(start, end)
                if path and distance < float("inf"):
                    all_paths.append((path, distance))
                    if distance < best_distance:
                        best_path = path
                        best_distance = distance

            self.update_pheromone(all_paths)

            # Store iteration details for visualization
            iterations_history.append({
                "iteration": iteration + 1,
                "paths": [(path, dist) for path, dist in all_paths[:5]],  # Store top 5 paths per iteration
                "best_path": best_path,
                "best_distance": best_distance,
                "pheromone_levels": {str(edge): level for edge, level in list(self.pheromone.items())[:10]}
            })

        return best_path, best_distance, iterations_history

    def construct_path(self, start, end):
        current = start
        path = [current]
        distance = 0
        visited = set([current])
        max_steps = 100  # Prevent infinite loops
        steps = 0

        while current != end and steps < max_steps:
            steps += 1
            # Find available neighbors (not blocked, not visited)
            neighbors = []
            for edge in self.graph:
                if edge[0] == current and edge[1] not in visited:
                    # Check if edge is not blocked
                    if edge not in self.blocked_edges and (edge[1], edge[0]) not in self.blocked_edges:
                        neighbors.append(edge[1])

            if not neighbors:
                # Try to find any neighbor even if visited (to complete path)
                neighbors = [edge[1] for edge in self.graph if edge[0] == current and edge not in self.blocked_edges]
                if not neighbors:
                    return None, float("inf")  # No path found

            probabilities = []
            for neighbor in neighbors:
                edge = (current, neighbor)
                pheromone = self.pheromone.get(edge, 1.0) ** self.alpha
                heuristic = (1.0 / self.graph[edge]) ** self.beta
                probabilities.append(pheromone * heuristic)

            total = sum(probabilities)
            if total == 0:
                return None, float("inf")

            probabilities = [p / total for p in probabilities]
            next_node = random.choices(neighbors, weights=probabilities)[0]

            path.append(next_node)
            distance += self.graph[(current, next_node)]
            visited.add(next_node)
            current = next_node

        if current != end:
            return None, float("inf")

        return path, distance

    def update_pheromone(self, paths):
        # Evaporate pheromone
        for edge in self.pheromone:
            self.pheromone[edge] *= (1 - self.evaporation)

        # Add pheromone from successful paths
        for path, distance in paths:
            if path and distance < float("inf"):
                for i in range(len(path) - 1):
                    edge = (path[i], path[i + 1])
                    if edge in self.pheromone:
                        self.pheromone[edge] += 1.0 / distance

    def get_all_nodes(self):
        """Extract all unique nodes from graph"""
        nodes = set()
        for edge in self.graph:
            nodes.add(edge[0])
            nodes.add(edge[1])
        return list(nodes)
