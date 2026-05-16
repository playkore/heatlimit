@tool
extends Node2D

@onready var tile_map: TileMapLayer = $TileMapLayer

func _ready() -> void:
	if tile_map == null:
		return

	if tile_map.get_used_cells().is_empty():
		_populate_demo_layout()

func _populate_demo_layout() -> void:
	for y in range(5):
		for x in range(2):
			tile_map.set_cell(Vector2i(x, y), 0, Vector2i(x, y), 0)
