import { Handle, Position } from "@xyflow/react";

function initials(name) {
  if (!name) return "NA";
  const parts = name.split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join("");
}

export default function OrgChartNode({ data }) {
  const borderColor = data.level === 0 ? "#2563EB" : data.level === 1 ? "#3B82F6" : "#93C5FD";

  return (
    <div className="tw-org-node" style={{ borderLeftColor: borderColor }}>
      <Handle type="target" position={Position.Top} />
      <div className="tw-org-node-avatar">{initials(data.fullName)}</div>
      <div>
        <div className="tw-org-node-name">{data.fullName}</div>
        <div className="tw-org-node-role">{data.roleName}</div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
