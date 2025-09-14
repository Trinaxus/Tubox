"use client";
import React, { useEffect, useState } from "react";
import AuthCheck from "../../components/AuthCheck";
import styles from "../admin.module.css";
import AdminNav from "../AdminNav";

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  
  // Bearbeiten Form State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    username: "",
    email: "",
    password: "",
    role: ""
  });

  // Benutzer laden
  const fetchUsers = async () => {
    setLoading(true);
    setError(""); // Fehler zurücksetzen
    
    try {
      const response = await fetch("/api/users");
      
      if (!response.ok) {
        throw new Error(`Fehler beim Laden der Benutzer: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("API-Antwort:", data);
      
      // Wir erwarten jetzt ein Objekt mit einem users-Array
      if (data && data.users && Array.isArray(data.users)) {
        setUsers(data.users);
      } else {
        console.error("Unerwartetes Antwortformat:", data);
        setUsers([]);
        setError("Unerwartetes Antwortformat von der API");
      }
    } catch (err) {
      console.error("Fehler beim Laden der Benutzer:", err);
      setUsers([]);
      setError(err instanceof Error ? err.message : "Unbekannter Fehler beim Laden der Benutzer");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Benutzer bearbeiten
  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    try {
      const updateData = {
        ...editForm,
        // Wenn kein Passwort eingegeben wurde, senden wir es nicht mit
        ...(editForm.password ? { password: editForm.password } : {})
      };
      
      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Fehler beim Aktualisieren des Benutzers: ${response.status}`);
      }
      
      setSuccessMsg(`Benutzer ${editingUser.username} erfolgreich aktualisiert`);
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler beim Aktualisieren des Benutzers");
    }
  };

  // Benutzer löschen
  const handleDeleteUser = async (userId: number, username: string) => {
    if (!confirm(`Möchten Sie den Benutzer ${username} wirklich löschen?`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Fehler beim Löschen des Benutzers: ${response.status}`);
      }
      
      setSuccessMsg(`Benutzer ${username} erfolgreich gelöscht`);
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler beim Löschen des Benutzers");
    }
  };

  // Benutzer zum Bearbeiten auswählen
  const startEditing = (user: User) => {
    setEditingUser(user);
    setEditForm({
      username: user.username,
      email: user.email,
      password: "", // Leeres Passwort, wird nur geändert, wenn eingegeben
      role: user.role
    });
  };

  // Automatisch Fehlermeldungen und Erfolgsmeldungen ausblenden
  useEffect(() => {
    if (error || successMsg) {
      const timer = setTimeout(() => {
        setError("");
        setSuccessMsg("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, successMsg]);

  return (
    <AuthCheck requiredRole="admin">
      <div className={styles.container}>
        <div className={styles.adminNavContainer}>
          <AdminNav />
        </div>
        <h1 className={styles.adminTitle}>Benutzerverwaltung</h1>
        <div className={styles.contentContainer}>
          <div className={styles.userSection}>
            {editingUser && (
              <div className={styles.formContainer}>
                <h3 className={styles.formTitle}>Benutzer bearbeiten: {editingUser.username}</h3>
                <form onSubmit={handleEditUser} className={styles.form}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Benutzername:</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={editForm.username}
                      onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>E-Mail:</label>
                    <input
                      type="email"
                      className={styles.input}
                      value={editForm.email}
                      onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Passwort (leer lassen, um nicht zu ändern):</label>
                    <input
                      type="password"
                      className={styles.input}
                      value={editForm.password}
                      onChange={(e) => setEditForm({...editForm, password: e.target.value})}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Rolle:</label>
                    <select
                      className={styles.select}
                      value={editForm.role}
                      onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                      required
                    >
                      <option value="user">Benutzer</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                  <div className={styles.formActions}>
                    <button type="submit" className={styles.submitButton}>Änderungen speichern</button>
                    <button 
                      type="button" 
                      className={styles.cancelButton}
                      onClick={() => setEditingUser(null)}
                    >
                      Abbrechen
                    </button>
                  </div>
                </form>
              </div>
            )}
            <div className={styles.userList}>
              {loading ? (
                <div className={styles.loading}>Lade Benutzer...</div>
              ) : users.length === 0 ? (
                <div className={styles.emptyState}>Keine Benutzer gefunden.</div>
              ) : (
                <table className={styles.userTable}>
                  <thead>
                    <tr>
                      <th>Benutzername</th>
                      <th>E-Mail</th>
                      <th>Rolle</th>
                      <th>Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className={styles.userRow}>
                        <td>{user.username}</td>
                        <td>{user.email}</td>
                        <td>
                          <span className={`${styles.roleTag} ${styles[`role${user.role.charAt(0).toUpperCase() + user.role.slice(1)}`]}`}>
                            {user.role === 'admin' ? 'Administrator' : 'Benutzer'}
                          </span>
                        </td>
                        <td className={styles.userActions}>
                          <button 
                            className={styles.editButton}
                            onClick={() => startEditing(user)}
                            title="Bearbeiten"
                          >
                            <img src="/assets/edit.svg" alt="Bearbeiten" style={{width:18,height:18,verticalAlign:'middle'}} />
                          </button>
                          <button 
                            className={styles.deleteButton}
                            onClick={() => handleDeleteUser(user.id, user.username)}
                            title="Löschen"
                          >
                            <img src="/assets/delete.svg" alt="Löschen" style={{width:18,height:18,verticalAlign:'middle'}} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthCheck>
  );
}
