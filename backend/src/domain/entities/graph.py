"""
Domain Entity: Graph
Represents the complete route network
"""
from dataclasses import dataclass, field
from typing import Dict, List
from copy import deepcopy
from .node import Node
from .edge import Edge


@dataclass
class Graph:
    """Graph entity representing the complete network"""
    nodes: Dict[str, Node] = field(default_factory=dict)
    edges: List[Edge] = field(default_factory=list)

    def add_node(self, node: Node) -> None:
        """Add a node to the graph"""
        self.nodes[node.id] = node

    def add_edge(self, edge: Edge) -> None:
        """Add an edge to the graph"""
        if edge.from_node not in self.nodes or edge.to_node not in self.nodes:
            raise ValueError("Both nodes must exist in graph before adding edge")
        self.edges.append(edge)

    def get_neighbors(self, node_id: str) -> List[str]:
        """Get all neighboring nodes (undirected graph)"""
        neighbors = []
        for edge in self.edges:
            if edge.is_blocked:
                continue
            if edge.from_node == node_id:
                neighbors.append(edge.to_node)
            elif edge.to_node == node_id:
                neighbors.append(edge.from_node)
        return neighbors

    def get_edge_weight(self, from_node: str, to_node: str) -> float:
        """Get weight of edge between two nodes (undirected graph)"""
        for edge in self.edges:
            if ((edge.from_node == from_node and edge.to_node == to_node) or
                (edge.from_node == to_node and edge.to_node == from_node)):
                return edge.weight
        raise ValueError(f"Edge from {from_node} to {to_node} not found")

    def block_edge(self, from_node: str, to_node: str) -> None:
        """Block an edge (simulate disaster)"""
        for i, edge in enumerate(self.edges):
            if ((edge.from_node == from_node and edge.to_node == to_node) or
                (edge.from_node == to_node and edge.to_node == from_node)):
                self.edges[i] = Edge(
                    from_node=edge.from_node,
                    to_node=edge.to_node,
                    weight=edge.weight,
                    is_blocked=True
                )

    def copy(self) -> 'Graph':
        """Create a deep copy of the graph"""
        return deepcopy(self)

    def remove_node(self, node_id: str) -> None:
        """Remove a node and all connected edges"""
        if node_id in self.nodes:
            del self.nodes[node_id]
        self.edges = [edge for edge in self.edges
                     if edge.from_node != node_id and edge.to_node != node_id]
