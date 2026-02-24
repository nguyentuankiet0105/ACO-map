"""
In-Memory Graph Repository Implementation
SOLID - Dependency Inversion: Implements IGraphRepository interface
"""
from typing import List, Dict
from ...domain.interfaces import IGraphRepository
from ...domain.entities import Graph, Node, Edge


class InMemoryGraphRepository(IGraphRepository):
    """
    Repository implementation for in-memory graph storage
    Can be easily replaced with database implementation
    """

    def __init__(self):
        self._graph = self._initialize_default_graph()

    def get_graph(self) -> Graph:
        """Get the complete graph"""
        return self._graph

    def get_node(self, node_id: str) -> Node:
        """Get a specific node by ID"""
        if node_id not in self._graph.nodes:
            raise ValueError(f"Node {node_id} not found")
        return self._graph.nodes[node_id]

    def get_all_nodes(self) -> List[Node]:
        """Get all nodes in the graph"""
        return list(self._graph.nodes.values())

    def get_all_edges(self) -> List[Edge]:
        """Get all edges in the graph"""
        return self._graph.edges

    def add_node(self, node: Node) -> None:
        """Add a new node to the graph"""
        self._graph.add_node(node)

    def remove_node(self, node_id: str) -> None:
        """Remove a node from the graph"""
        self._graph.remove_node(node_id)

    def add_edge(self, edge: Edge) -> None:
        """Add a new edge to the graph"""
        self._graph.add_edge(edge)

    def remove_edge(self, from_node: str, to_node: str) -> None:
        """Remove an edge from the graph"""
        self._graph.edges = [
            edge for edge in self._graph.edges
            if not ((edge.from_node == from_node and edge.to_node == to_node) or
                   (edge.from_node == to_node and edge.to_node == from_node))
        ]

    def _initialize_default_graph(self) -> Graph:
        """Initialize graph with default mountain trekking data"""
        graph = Graph()

        # Add nodes with GPS coordinates (Hanoi area - Ba Vi Mountain)
        nodes_data = {
            "A": {"lat": 21.0285, "lng": 105.8542, "name": "Ba Vi Mountain Base"},
            "B": {"lat": 21.0385, "lng": 105.8642, "name": "Trail Junction 1"},
            "C": {"lat": 21.0185, "lng": 105.8642, "name": "Trail Junction 2"},
            "D": {"lat": 21.0285, "lng": 105.8742, "name": "Mountain Pass"},
            "E": {"lat": 21.0485, "lng": 105.8742, "name": "North Peak"},
            "F": {"lat": 21.0285, "lng": 105.8842, "name": "Valley Point"},
            "G": {"lat": 21.0285, "lng": 105.8942, "name": "Summit Station"},
            "H": {"lat": 21.0385, "lng": 105.8942, "name": "Peak Viewpoint"},
        }

        for node_id, data in nodes_data.items():
            node = Node(
                id=node_id,
                latitude=data["lat"],
                longitude=data["lng"],
                name=data["name"]
            )
            graph.add_node(node)

        # Add edges with weights (distances in km)
        edges_data = [
            ("A", "B", 2.5), ("A", "C", 5.2), ("A", "D", 8.1),
            ("B", "C", 1.8), ("B", "E", 3.4),
            ("C", "D", 2.3), ("C", "F", 4.6),
            ("D", "G", 3.2),
            ("E", "F", 2.7), ("E", "H", 5.5),
            ("F", "G", 1.9), ("F", "H", 3.8),
            ("G", "H", 2.4),
        ]

        for from_node, to_node, weight in edges_data:
            edge = Edge(from_node=from_node, to_node=to_node, weight=weight)
            graph.add_edge(edge)

        return graph
