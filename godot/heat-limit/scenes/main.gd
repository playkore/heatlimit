@tool
extends Node2D

const BASE_VIEWPORT_SIZE := Vector2(320, 640)

@onready var background_layer: TileMapLayer = $BackgroundLayer
@onready var camera: Camera2D = $Camera2D
@onready var tile_map: TileMapLayer = $TileMapLayer

func _ready() -> void:
	if camera != null:
		camera.make_current()
