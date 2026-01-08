"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

interface Member {
  id: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  requireApproval: boolean;
  role: string;
  memberCount: number;
}

interface Invite {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
}

const ROLES = ["ADMIN", "EDITOR", "MEMBER", "VIEWER"];

export default function TeamPage() {
  const { data: session, status } = useSession();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [newWorkspace, setNewWorkspace] = useState({
    name: "",
    description: "",
    requireApproval: false,
  });
  const [newInvite, setNewInvite] = useState({ email: "", role: "MEMBER" });

  useEffect(() => {
    if (status === "authenticated") {
      fetchWorkspaces();
    }
  }, [status]);

  useEffect(() => {
    if (selectedWorkspace) {
      fetchMembers();
    }
  }, [selectedWorkspace]);

  if (status === "loading") return <div className="p-8">Loading...</div>;
  if (status === "unauthenticated") redirect("/login");

  async function fetchWorkspaces() {
    try {
      const res = await fetch("/api/workspaces");
      const data = await res.json();
      setWorkspaces(data);
      if (data.length > 0) {
        setSelectedWorkspace(data[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch workspaces:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchMembers() {
    if (!selectedWorkspace) return;

    const res = await fetch(`/api/workspaces?workspaceId=${selectedWorkspace}`);
    const data = await res.json();
    setMembers(data?.members || []);
    setInvites(data?.invites || []);
  }

  async function createWorkspace() {
    if (!newWorkspace.name) return;

    await fetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newWorkspace),
    });

    setShowCreateModal(false);
    setNewWorkspace({ name: "", description: "", requireApproval: false });
    fetchWorkspaces();
  }

  async function inviteMember() {
    if (!newInvite.email || !selectedWorkspace) return;

    await fetch("/api/workspaces/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "invite",
        workspaceId: selectedWorkspace,
        email: newInvite.email,
        role: newInvite.role,
      }),
    });

    setShowInviteModal(false);
    setNewInvite({ email: "", role: "MEMBER" });
    fetchMembers();
  }

  async function updateRole(memberId: string, newRole: string) {
    await fetch("/api/workspaces/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "updateRole",
        workspaceId: selectedWorkspace,
        memberId,
        newRole,
      }),
    });
    fetchMembers();
  }

  async function removeMember(memberId: string) {
    if (!confirm("Remove this member?")) return;

    await fetch("/api/workspaces/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "remove",
        workspaceId: selectedWorkspace,
        memberId,
      }),
    });
    fetchMembers();
  }

  const currentWorkspace = workspaces.find((w) => w.id === selectedWorkspace);
  const canManage = currentWorkspace?.role === "OWNER" || currentWorkspace?.role === "ADMIN";

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Team Workspaces</h1>
          <p className="text-[var(--x-text-secondary)]">
            Collaborate with your team on social media content
          </p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
          New Workspace
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--x-text-secondary)]">
          Loading...
        </div>
      ) : workspaces.length === 0 ? (
        <div className="x-card p-12 text-center">
          <p className="text-[var(--x-text-secondary)] mb-4">
            No workspaces yet. Create one to start collaborating.
          </p>
        </div>
      ) : (
        <>
          {/* Workspace Selector */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => setSelectedWorkspace(ws.id)}
                className={`px-4 py-2 rounded-full whitespace-nowrap ${
                  selectedWorkspace === ws.id
                    ? "bg-[var(--x-blue)] text-white"
                    : "bg-[var(--x-bg-secondary)]"
                }`}
              >
                {ws.name} ({ws.memberCount})
              </button>
            ))}
          </div>

          {/* Current Workspace */}
          {currentWorkspace && (
            <div className="x-card p-6 mb-8">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold">{currentWorkspace.name}</h2>
                  {currentWorkspace.description && (
                    <p className="text-[var(--x-text-secondary)]">
                      {currentWorkspace.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="x-badge">{currentWorkspace.role}</span>
                  {currentWorkspace.requireApproval && (
                    <span className="x-badge x-badge-blue">Approval Required</span>
                  )}
                </div>
              </div>

              {canManage && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="btn-secondary"
                >
                  Invite Member
                </button>
              )}
            </div>
          )}

          {/* Members */}
          <h3 className="font-bold mb-4">Members</h3>
          <div className="space-y-3 mb-8">
            {members.map((member) => (
              <div
                key={member.id}
                className="x-card p-4 flex justify-between items-center"
              >
                <div className="flex items-center gap-3">
                  {member.user.image ? (
                    <img
                      src={member.user.image}
                      alt=""
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[var(--x-bg-elevated)] flex items-center justify-center">
                      {(member.user.name || member.user.email)[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-bold">
                      {member.user.name || member.user.email}
                    </p>
                    <p className="text-sm text-[var(--x-text-secondary)]">
                      {member.user.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {canManage && member.role !== "OWNER" ? (
                    <>
                      <select
                        value={member.role}
                        onChange={(e) => updateRole(member.id, e.target.value)}
                        className="x-input text-sm py-1"
                      >
                        {ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => removeMember(member.id)}
                        className="text-red-500 text-sm"
                      >
                        Remove
                      </button>
                    </>
                  ) : (
                    <span className="x-badge">{member.role}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pending Invites */}
          {invites.length > 0 && (
            <>
              <h3 className="font-bold mb-4">Pending Invites</h3>
              <div className="space-y-3">
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="x-card p-4 flex justify-between items-center"
                  >
                    <div>
                      <p>{invite.email}</p>
                      <p className="text-sm text-[var(--x-text-secondary)]">
                        Expires: {new Date(invite.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="x-badge">{invite.role}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 x-modal-overlay flex items-center justify-center z-50">
          <div className="x-modal p-6">
            <h2 className="text-xl font-bold mb-4">Create Workspace</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Workspace name"
                value={newWorkspace.name}
                onChange={(e) =>
                  setNewWorkspace({ ...newWorkspace, name: e.target.value })
                }
                className="x-input"
              />
              <textarea
                placeholder="Description (optional)"
                value={newWorkspace.description}
                onChange={(e) =>
                  setNewWorkspace({ ...newWorkspace, description: e.target.value })
                }
                className="x-input"
                rows={2}
              />
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newWorkspace.requireApproval}
                  onChange={(e) =>
                    setNewWorkspace({
                      ...newWorkspace,
                      requireApproval: e.target.checked,
                    })
                  }
                />
                <span className="text-sm">Require approval for posts</span>
              </label>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button onClick={createWorkspace} className="btn-primary">
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 x-modal-overlay flex items-center justify-center z-50">
          <div className="x-modal p-6">
            <h2 className="text-xl font-bold mb-4">Invite Member</h2>
            <div className="space-y-4">
              <input
                type="email"
                placeholder="Email address"
                value={newInvite.email}
                onChange={(e) =>
                  setNewInvite({ ...newInvite, email: e.target.value })
                }
                className="x-input"
              />
              <select
                value={newInvite.role}
                onChange={(e) =>
                  setNewInvite({ ...newInvite, role: e.target.value })
                }
                className="x-input"
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowInviteModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button onClick={inviteMember} className="btn-primary">
                Send Invite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
