import "@xyflow/react/dist/style.css";
import {
  addEdge,
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addEmployeeToChart,
  getHierarchyBootstrap,
  removeNodeFromChart,
  saveLayout,
  saveNodePosition,
  updateParentNode,
} from "../../lib/db/hierarchy";
import { toast } from "../../stores/toastStore";
import OrgChartNode from "./OrgChartNode";

const nodeTypes = { orgNode: OrgChartNode };

function buildDepthMap(nodes) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const depthMap = new Map();

  function depthFor(nodeId) {
    if (!nodeId) return 0;
    if (depthMap.has(nodeId)) return depthMap.get(nodeId);
    const node = byId.get(nodeId);
    if (!node || !node.parent_node_id) {
      depthMap.set(nodeId, 0);
      return 0;
    }
    const depth = depthFor(node.parent_node_id) + 1;
    depthMap.set(nodeId, depth);
    return depth;
  }

  nodes.forEach((node) => depthFor(node.id));
  return depthMap;
}

function autoArrange(nodesData) {
  const byParent = new Map();
  const roots = [];

  nodesData.forEach((node) => {
    if (!node.parent_node_id) roots.push(node.id);
    const key = node.parent_node_id || "ROOT";
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(node.id);
  });

  const placements = new Map();
  let cursorX = 0;

  function walk(nodeId, depth) {
    const children = byParent.get(nodeId) || [];
    if (!children.length) {
      placements.set(nodeId, { x: cursorX * 220, y: depth * 150 });
      cursorX += 1;
      return placements.get(nodeId).x;
    }

    const childXs = children.map((childId) => walk(childId, depth + 1));
    const meanX = childXs.reduce((sum, x) => sum + x, 0) / childXs.length;
    placements.set(nodeId, { x: meanX, y: depth * 150 });
    return meanX;
  }

  roots.forEach((rootId) => walk(rootId, 0));

  return nodesData.map((node) => ({
    ...node,
    canvas_x: placements.get(node.id)?.x ?? node.canvas_x,
    canvas_y: placements.get(node.id)?.y ?? node.canvas_y,
  }));
}

export default function OrgChart() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [rawNodes, setRawNodes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const paneRef = useRef(null);

  const chartEmployeeIds = useMemo(() => new Set(rawNodes.map((row) => row.employee_id)), [rawNodes]);

  const availableEmployees = useMemo(
    () => employees.filter((employee) => !chartEmployeeIds.has(employee.id)),
    [chartEmployeeIds, employees]
  );

  const hydrate = useCallback(async () => {
    const data = await getHierarchyBootstrap();
    const depthMap = buildDepthMap(data.nodes);

    setRawNodes(data.nodes);
    setEmployees(data.employees);

    setNodes(
      data.nodes.map((node) => {
        const employee = data.employees.find((emp) => emp.id === node.employee_id);
        const level = depthMap.get(node.id) || 0;

        return {
          id: node.id,
          type: "orgNode",
          data: {
            fullName: employee?.full_name || "Unknown",
            roleName: employee?.role_name || "No role",
            level,
          },
          position: { x: node.canvas_x, y: node.canvas_y },
        };
      })
    );

    setEdges(
      data.nodes
        .filter((node) => node.parent_node_id)
        .map((node) => ({
          id: `e-${node.parent_node_id}-${node.id}`,
          source: node.parent_node_id,
          target: node.id,
          deletable: true,
        }))
    );
  }, [setEdges, setNodes]);

  useEffect(() => {
    hydrate().catch(() => {
      toast.error("Failed to load org chart.");
    });
  }, [hydrate]);

  const onConnect = useCallback(
    async (params) => {
      if (!params?.source || !params?.target) return;
      setEdges((current) => addEdge(params, current));
      await updateParentNode(params.target, params.source);
      await hydrate();
    },
    [hydrate, setEdges]
  );

  const onNodeDragStop = useCallback(async (_event, node) => {
    await saveNodePosition(node.id, node.position.x, node.position.y);
  }, []);

  const onEdgeContextMenu = useCallback(
    async (event, edge) => {
      event.preventDefault();
      await updateParentNode(edge.target, null);
      await hydrate();
      toast.info("Reporting line removed.");
    },
    [hydrate]
  );

  const onNodeContextMenu = useCallback(
    async (event, node) => {
      event.preventDefault();
      await removeNodeFromChart(node.id);
      await hydrate();
      toast.info("Employee removed from chart.");
    },
    [hydrate]
  );

  async function handleSaveLayout() {
    await saveLayout(nodes);
    toast.success("Layout saved.");
  }

  async function handleAutoArrange() {
    const arranged = autoArrange(rawNodes);
    const depthMap = buildDepthMap(arranged);

    setNodes(
      arranged.map((node) => {
        const employee = employees.find((emp) => emp.id === node.employee_id);
        return {
          id: node.id,
          type: "orgNode",
          data: {
            fullName: employee?.full_name || "Unknown",
            roleName: employee?.role_name || "No role",
            level: depthMap.get(node.id) || 0,
          },
          position: { x: node.canvas_x, y: node.canvas_y },
        };
      })
    );

    setRawNodes(arranged);
  }

  const onDrop = useCallback(
    async (event) => {
      event.preventDefault();
      const employeeId = event.dataTransfer.getData("application/employee-id");
      if (!employeeId) return;

      const bounds = paneRef.current?.getBoundingClientRect();
      const x = event.clientX - (bounds?.left || 0);
      const y = event.clientY - (bounds?.top || 0);

      await addEmployeeToChart({ employeeId, x, y });
      await hydrate();
      toast.success("Employee added to chart.");
    },
    [hydrate]
  );

  return (
    <div className="tw-hierarchy-layout">
      <aside className="tw-hierarchy-side">
        <h3>Employees not on chart</h3>
        <p className="tw-muted-text">Drag employees onto the canvas to add a node.</p>
        <div className="tw-hierarchy-list">
          {availableEmployees.map((employee) => (
            <div
              key={employee.id}
              className="tw-hierarchy-item"
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData("application/employee-id", employee.id);
                event.dataTransfer.effectAllowed = "move";
              }}
            >
              <strong>{employee.full_name}</strong>
              <small>{employee.role_name}</small>
            </div>
          ))}
        </div>
      </aside>

      <section className="tw-hierarchy-canvas" ref={paneRef} onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
        <div className="tw-hierarchy-toolbar">
          <button type="button" onClick={handleAutoArrange}>Auto-arrange</button>
          <button type="button" onClick={handleSaveLayout}>Save layout</button>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          onNodeContextMenu={onNodeContextMenu}
          onEdgeContextMenu={onEdgeContextMenu}
          snapToGrid
          snapGrid={[20, 20]}
          fitView
        >
          <Background gap={20} />
          <MiniMap />
          <Controls />
        </ReactFlow>
      </section>
    </div>
  );
}
