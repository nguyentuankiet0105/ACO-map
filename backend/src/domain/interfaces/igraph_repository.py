"""
Repository Interface (SOLID - Dependency Inversion Principle)
Defines contract for graph data access
"""
from abc import ABC, abstractmethod
from typing import List
from ..entities import Graph, Node, Edge


class IGraphRepository(ABC):
    """Interface for graph data access"""

    @abstractmethod
    def get_graph(self) -> Graph:
        """Retrieve the complete graph"""
        pass

    @abstractmethod
    def get_node(self, node_id: str) -> Node:
        """Get a specific node"""
        pass

    @abstractmethod
    def get_all_nodes(self) -> List[Node]:
        """Get all nodes"""
        pass

    @abstractmethod
    def get_all_edges(self) -> List[Edge]:
        """Get all edges"""
        pass
