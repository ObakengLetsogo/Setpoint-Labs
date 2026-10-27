"""Shared helpers for building rig parts headless with Blender (bpy).

Blender axes: X = width, Y = back (our scene -Z), Z = up. The glTF exporter
converts to Y-up, so a part modelled here lands in the scene with the same
local frame as the procedural version it replaces.
"""

import math
import os

import bpy


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    world = bpy.data.worlds.new("World")
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (1, 1, 1, 1)
    world.light_settings.distance = 0.12
    return scene


def material(name, color, roughness=0.45, metallic=0.0):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    r, g, b = (int(color[i : i + 2], 16) / 255 for i in (1, 3, 5))
    bsdf.inputs["Base Color"].default_value = (srgb_to_linear(r), srgb_to_linear(g), srgb_to_linear(b), 1)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    return mat


def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def box(name, size, location, mat=None, bevel=0.03, segments=3):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if mat:
        obj.data.materials.append(mat)
    if bevel:
        add_bevel(obj, bevel, segments)
    return obj


def cylinder(name, radius, depth, location, mat=None, rotation=(0, 0, 0), vertices=32, bevel=0.0):
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, location=location, rotation=rotation, vertices=vertices)
    obj = bpy.context.active_object
    obj.name = name
    if mat:
        obj.data.materials.append(mat)
    if bevel:
        add_bevel(obj, bevel, 2)
    return obj


def add_bevel(obj, width, segments):
    mod = obj.modifiers.new("Bevel", "BEVEL")
    mod.width = width
    mod.segments = segments
    mod.limit_method = "ANGLE"
    mod.angle_limit = math.radians(35)
    mod.harden_normals = True
    return mod


def cut(target, cutter):
    """Boolean difference, placed before the bevel so pocket rims get bevelled too."""
    mod = target.modifiers.new(f"Cut_{cutter.name}", "BOOLEAN")
    mod.operation = "DIFFERENCE"
    mod.object = cutter
    mod.solver = "EXACT"
    bevels = [m for m in target.modifiers if m.type == "BEVEL"]
    if bevels:
        idx = list(target.modifiers).index(bevels[0])
        bpy.context.view_layer.objects.active = target
        bpy.ops.object.modifier_move_to_index(modifier=mod.name, index=idx)
    cutter.hide_render = True
    cutter.hide_viewport = True
    cutter["cutter"] = True
    return mod


def screw(name, location, mat, radius=0.05, slot_mat=None, cross=True):
    head = cylinder(name, radius, radius * 0.55, location, mat, vertices=24, bevel=radius * 0.2)
    slot_w = radius * 0.22
    s1 = box(f"{name}_slot1", (radius * 1.7, slot_w, radius * 0.4), (location[0], location[1], location[2] + radius * 0.2), None, 0)
    cut(head, s1)
    if cross:
        s2 = box(f"{name}_slot2", (slot_w, radius * 1.7, radius * 0.4), (location[0], location[1], location[2] + radius * 0.2), None, 0)
        cut(head, s2)
    return head


def finalize_mesh(objs):
    """Apply modifiers, drop cutters, join into one mesh with weighted normals."""
    for o in list(bpy.data.objects):
        if o.get("cutter"):
            continue
    keep = [o for o in objs if not o.get("cutter")]
    bpy.ops.object.select_all(action="DESELECT")
    for o in keep:
        o.hide_viewport = False
        o.select_set(True)
    bpy.context.view_layer.objects.active = keep[0]
    bpy.ops.object.convert(target="MESH")
    for o in list(bpy.data.objects):
        if o.get("cutter"):
            bpy.data.objects.remove(o, do_unlink=True)
    bpy.ops.object.select_all(action="DESELECT")
    for o in keep:
        o.select_set(True)
    bpy.context.view_layer.objects.active = keep[0]
    bpy.ops.object.join()
    joined = bpy.context.active_object
    wn = joined.modifiers.new("WeightedNormal", "WEIGHTED_NORMAL")
    wn.keep_sharp = True
    bpy.ops.object.convert(target="MESH")
    return joined


def bake_ao(obj, size=1024, samples=96, out_dir="/tmp"):
    """Bake ambient occlusion into one atlas and multiply it into every material's base colour."""
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = samples
    scene.render.bake.margin = 6

    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.material_slot_remove_unused()
    for i in reversed(range(len(obj.material_slots))):
        if obj.material_slots[i].material is None:
            obj.active_material_index = i
            bpy.ops.object.material_slot_remove()
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.012)
    bpy.ops.object.mode_set(mode="OBJECT")

    img = bpy.data.images.new(f"{obj.name}_ao", size, size, alpha=False)
    nodes = []
    for slot in obj.material_slots:
        nt = slot.material.node_tree
        node = nt.nodes.new("ShaderNodeTexImage")
        node.image = img
        nt.nodes.active = node
        nodes.append((slot.material, node))

    bpy.ops.object.bake(type="AO")
    img.filepath_raw = os.path.join(out_dir, f"{obj.name}_ao.png")
    img.file_format = "PNG"
    img.save()

    for mat, node in nodes:
        nt = mat.node_tree
        bsdf = nt.nodes["Principled BSDF"]
        color = tuple(bsdf.inputs["Base Color"].default_value)
        mix = nt.nodes.new("ShaderNodeMix")
        mix.data_type = "RGBA"
        mix.blend_type = "MULTIPLY"
        mix.inputs["Factor"].default_value = 1.0
        mix.inputs[7].default_value = color
        nt.links.new(node.outputs["Color"], mix.inputs[6])
        nt.links.new(mix.outputs[2], bsdf.inputs["Base Color"])
    return img


def export_glb(path):
    bpy.ops.object.select_all(action="DESELECT")
    for o in bpy.data.objects:
        if o.type == "MESH":
            o.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_image_format="JPEG",
        export_jpeg_quality=88,
        export_yup=True,
        export_texcoords=True,
        export_normals=True,
        export_materials="EXPORT",
    )
