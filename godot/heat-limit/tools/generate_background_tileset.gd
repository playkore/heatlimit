extends SceneTree

const TILE_SIZE := Vector2i(80, 48)
const SOURCE_PATH := "res://assets/background-tiles.png"
const TILESET_PATH := "res://assets/background-tiles.tres"

func _init() -> void:
	var image := Image.new()
	var image_path := ProjectSettings.globalize_path(SOURCE_PATH)
	var image_error := image.load(image_path)
	if image_error != OK:
		push_error("Failed to load image: %s (%d)" % [image_path, image_error])
		quit(1)
		return

	var texture := ImageTexture.create_from_image(image)

	var tileset := TileSet.new()
	tileset.tile_size = TILE_SIZE

	var atlas := TileSetAtlasSource.new()
	atlas.texture = texture
	atlas.texture_region_size = TILE_SIZE

	for y in range(2):
		for x in range(3):
			atlas.create_tile(Vector2i(x, y))

	var source_id := tileset.add_source(atlas, 0)
	if source_id != 0:
		push_error("Unexpected TileSet source id: %d" % source_id)
		quit(1)
		return

	var err := ResourceSaver.save(tileset, TILESET_PATH)
	if err != OK:
		push_error("Failed to save TileSet: %s (%d)" % [TILESET_PATH, err])
		quit(1)
		return

	print("Saved TileSet to %s" % TILESET_PATH)
	quit(0)
