"""
Get Graph Use Case
SOLID - Single Responsibility: Only handles graph retrieval
"""
from typing import Dict, List, Any
from ...domain.interfaces import IGraphRepository


class GetGraphUseCase:
    """
    Use case for retrieving graph structure
    Returns graph in format suitable for frontend
    """

    def __init__(self, graph_repository: IGraphRepository):
        self._repository = graph_repository

    def execute(self) -> Dict[str, Any]:
        """
        Execute the use case

        Returns:
            Dictionary with nodes and edges in API format
        """
        graph = self._repository.get_graph()

        # Convert to API format
        nodes_dict = {}
        for node_id, node in graph.nodes.items():
            nodes_dict[node_id] = {
                "lat": node.latitude,
                "lng": node.longitude,
                "name": node.name
            }

        edges_list = []
        for edge in graph.edges:
            edges_list.append({
                "from": edge.from_node,
                "to": edge.to_node,
                "weight": edge.weight,
                "is_blocked": edge.is_blocked
            })

        return {
            "nodes": nodes_dict,
            "edges": edges_list
        }
