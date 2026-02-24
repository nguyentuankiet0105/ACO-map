"""
Find Optimal Path Use Case
SOLID - Single Responsibility: Only coordinates path finding business logic
"""
from typing import List, Optional
from ...domain.interfaces import IGraphRepository, IPathFinderAlgorithm
from ...domain.entities import OptimizationResult, Path


class FindOptimalPathUseCase:
    """
    Use case for finding optimal path between two points
    Coordinates repository, algorithm, and business rules
    """

    def __init__(
        self,
        graph_repository: IGraphRepository,
        path_finder: IPathFinderAlgorithm
    ):
        """
        Constructor injection for dependencies (DIP)
        """
        self._repository = graph_repository
        self._path_finder = path_finder

    def execute(
        self,
        start_node_id: str,
        end_node_id: str,
        blocked_edges: Optional[List[tuple]] = None
    ) -> OptimizationResult:
        """
        Execute the use case

        Args:
            start_node_id: Starting node ID
            end_node_id: Ending node ID
            blocked_edges: List of blocked edges (disaster simulation)

        Returns:
            OptimizationResult with best path and iteration history
        """
        # Validate inputs
        if not start_node_id or not end_node_id:
            raise ValueError("Start and end nodes must be provided")

        if start_node_id == end_node_id:
            # Same start and end - return direct path
            return OptimizationResult(
                best_path=Path(nodes=[start_node_id], distance=0.0),
                iterations_history=[],
                total_iterations=0,
                ants_per_iteration=0
            )

        # Get graph from repository and create a working copy
        # This prevents modifying the original graph (fixes persistence bug)
        original_graph = self._repository.get_graph()
        graph = original_graph.copy()

        # Validate nodes exist
        if start_node_id not in graph.nodes:
            raise ValueError(f"Start node '{start_node_id}' not found in graph")
        if end_node_id not in graph.nodes:
            raise ValueError(f"End node '{end_node_id}' not found in graph")

        # Block edges if specified (disaster scenario)
        if blocked_edges:
            for from_node, to_node in blocked_edges:
                try:
                    graph.block_edge(from_node, to_node)
                except Exception as e:
                    print(f"Warning: Could not block edge {from_node}-{to_node}: {e}")

        # Find optimal path using algorithm
        best_path = self._path_finder.find_optimal_path(
            graph=graph,
            start_node=start_node_id,
            end_node=end_node_id,
            blocked_edges=blocked_edges
        )

        # Get iteration history from algorithm
        iterations_history = self._path_finder.get_iterations_history()

        # Create result
        result = OptimizationResult(
            best_path=best_path,
            iterations_history=iterations_history,
            total_iterations=len(iterations_history),
            ants_per_iteration=self._path_finder.n_ants
        )

        return result
