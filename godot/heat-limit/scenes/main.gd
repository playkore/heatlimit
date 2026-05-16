@tool
extends Node2D

const BASE_VIEWPORT_SIZE := Vector2(320, 640)

@onready var background_layer: TileMapLayer = $BackgroundLayer
@onready var camera: Camera2D = $Camera2D
@onready var building_dialog: AcceptDialog = $BuildingDialog
@onready var tile_map: TileMapLayer = $TileMapLayer

func _ready() -> void:
	if camera != null:
		camera.make_current()
	set_process_input(true)

func _input(event: InputEvent) -> void:
	if Engine.is_editor_hint():
		return
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		_show_building_dialog_at_mouse_position()

func _show_building_dialog_at_mouse_position() -> void:
	if tile_map == null or building_dialog == null:
		return

	var cell := tile_map.local_to_map(tile_map.get_local_mouse_position())
	if tile_map.get_cell_source_id(cell) == -1:
		return

	building_dialog.title = "Постройка"
	building_dialog.dialog_text = "Выбрана постройка на клетке %s." % [cell]
	building_dialog.popup_centered()
