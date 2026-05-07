from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
import numpy as np
from scipy.spatial.distance import pdist, squareform
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp

app = FastAPI()

# --- Modèles de données ---
class Bin(BaseModel):
    bin_id: str
    lat: float
    lng: float
    fill_level: float
    bin_type: str

class RouteRequest(BaseModel):
    bins: List[Bin]
    depot_lat: float # Point de départ du camion
    depot_lng: float
    truck_capacity: int # Nombre max de poubelles que le camion peut vider
    fill_threshold: float = 75.0 # Niveau de remplissage minimum pour être collectée
    target_bin_type: str # Ex: "recycling", "general"

# --- Logique d'optimisation ---
def create_data_model(locations, demands, vehicle_capacities, num_vehicles, depot_index=0):
    data = {}
    
    dist_matrix = squareform(pdist(locations, metric='euclidean')) * 100000 
    data['distance_matrix'] = dist_matrix.astype(int).tolist()
    
    data['demands'] = demands
    data['vehicle_capacities'] = vehicle_capacities
    data['num_vehicles'] = num_vehicles
    data['depot'] = depot_index
    return data

@app.post("/generate_route")
async def optimize_route(request: RouteRequest):
    bins_to_collect = [
        b for b in request.bins 
        if b.bin_type == request.target_bin_type and b.fill_level >= request.fill_threshold
    ]
    
    if not bins_to_collect:
        return {"route": [], "total_distance": 0, "message": "Aucune poubelle à collecter avec ces critères."}

    locations = [[request.depot_lat, request.depot_lng]]
    demands = [0] # Le dépôt n'a pas de demande
    bin_mapping = {} # Pour retrouver l'ID de la poubelle à partir de son index
    
    for i, b in enumerate(bins_to_collect):
        locations.append([b.lat, b.lng])
        demands.append(1) # Chaque poubelle compte pour "1" unité dans le camion
        bin_mapping[i + 1] = b.bin_id

    data = create_data_model(
        locations=locations, 
        demands=demands, 
        vehicle_capacities=[request.truck_capacity], 
        num_vehicles=1
    )

    manager = pywrapcp.RoutingIndexManager(len(data['distance_matrix']), data['num_vehicles'], data['depot'])
    routing = pywrapcp.RoutingModel(manager)

    def distance_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return data['distance_matrix'][from_node][to_node]

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    def demand_callback(from_index):
        from_node = manager.IndexToNode(from_index)
        return data['demands'][from_node]

    demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
    routing.AddDimensionWithVehicleCapacity(
        demand_callback_index,
        0,  # null capacity slack
        data['vehicle_capacities'],  # vehicle maximum capacities
        True,  # start cumul to zero
        'Capacity')

    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC)

    solution = routing.SolveWithParameters(search_parameters)

    if solution:
        route_sequence = []
        index = routing.Start(0)
        while not routing.IsEnd(index):
            node_index = manager.IndexToNode(index)
            if node_index != 0: # Ne pas inclure le dépôt dans la liste des poubelles
                route_sequence.append(bin_mapping[node_index])
            index = solution.Value(routing.NextVar(index))
            
        return {
            "status": "success",
            "route_sequence": route_sequence, # Ordre optimisé des IDs de poubelles
            "bins_collected": len(route_sequence),
            # Remise à l'échelle de la distance (approximation)
            "approx_distance_metric": solution.ObjectiveValue() / 100000 
        }
    else:
        raise HTTPException(status_code=400, detail="Aucune solution trouvée (vérifiez la capacité du camion).")

# --- Pour tester localement ---
#if __name__ == "__main__":
#    import uvicorn
#    uvicorn.run(app, host="0.0.0.0", port=8001)