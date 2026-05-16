@tool
extends Node2D

@onready var background_layer: TileMapLayer = $BackgroundLayer
@onready var tile_map: TileMapLayer = $TileMapLayer

func _ready() -> void:
	if background_layer != null and background_layer.get_used_cells().is_empty():
		_populate_background()

	if tile_map == null:
		return

	if tile_map.get_used_cells().is_empty():
		_populate_demo_layout()

func _populate_background() -> void:
	for y in range(2):
		for x in range(3):
			background_layer.set_cell(Vector2i(x, y), 0, Vector2i(x, y), 0)

func _populate_demo_layout() -> void:
	for y in range(5):
		for x in range(2):
			tile_map.set_cell(Vector2i(x, y), 0, Vector2i(x, y), 0)
