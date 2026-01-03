import React, { useState } from 'react';
import { School } from '../types';
import { Plus, Pencil, Trash2, Building2, X, Check, School as SchoolIcon } from 'lucide-react';

interface Props {
  schools: School[];
  onAddSchool: (code: string, name: string) => void;
  onUpdateSchool: (id: string, code: string, name: string) => void;
  onDeleteSchool: (id: string) => void;
}

export const SchoolManagement: React.FC<Props> = ({ schools, onAddSchool, onUpdateSchool, onDeleteSchool }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newSchoolCode, setNewSchoolCode] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingCode, setEditingCode] = useState('');

  const handleSaveNew = () => {
    if (newSchoolName.trim() && newSchoolCode.trim()) {
      onAddSchool(newSchoolCode.trim(), newSchoolName.trim());
      setNewSchoolName('');
      setNewSchoolCode('');
      setIsAdding(false);
    }
  };

  const handleStartEdit = (school: School) => {
    setEditingId(school.id);
    setEditingName(school.name);
    setEditingCode(school.code);
  };

  const handleSaveEdit = () => {
    if (editingId && editingName.trim() && editingCode.trim()) {
      onUpdateSchool(editingId, editingCode.trim(), editingName.trim());
      setEditingId(null);
      setEditingName('');
      setEditingCode('');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-orange-100 dark:border-gray-700 overflow-hidden animate-fade-in">
      <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
        <h3 className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
          <Building2 size={20} className="text-orange-500" />
          Gerenciar Escolas
        </h3>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus size={16} />
          Nova Escola
        </button>
      </div>

      <div className="p-6">
        {isAdding && (
          <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-xl flex items-center gap-3 animate-fade-in flex-wrap">
            <input
              autoFocus
              type="text"
              placeholder="Código"
              className="w-24 p-2 border rounded-lg dark:bg-gray-900 dark:text-white dark:border-gray-700 outline-none focus:ring-2 focus:ring-orange-500"
              value={newSchoolCode}
              onChange={(e) => setNewSchoolCode(e.target.value)}
            />
            <input
              type="text"
              placeholder="Nome da Escola"
              className="flex-1 p-2 border rounded-lg dark:bg-gray-900 dark:text-white dark:border-gray-700 outline-none focus:ring-2 focus:ring-orange-500"
              value={newSchoolName}
              onChange={(e) => setNewSchoolName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveNew()}
            />
            <div className="flex gap-2">
              <button onClick={handleSaveNew} className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"><Check size={20} /></button>
              <button onClick={() => setIsAdding(false)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"><X size={20} /></button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          {schools.length === 0 && !isAdding && (
            <div className="col-span-full py-12 text-center text-gray-400 italic">
              Nenhuma escola cadastrada. Adicione escolas para organizar seus alunos.
            </div>
          )}

          {schools.map(school => (
            <div key={school.id} className="p-4 bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-xl shadow-sm flex items-center justify-between group hover:border-orange-200 transition-all">
              {editingId === school.id ? (
                <div className="flex items-center gap-2 w-full flex-wrap">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Código"
                    className="w-24 p-1 border rounded bg-gray-50 dark:bg-gray-900 dark:text-white outline-none"
                    value={editingCode}
                    onChange={(e) => setEditingCode(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Nome"
                    className="flex-1 p-1 border rounded bg-gray-50 dark:bg-gray-900 dark:text-white outline-none"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                  />
                  <button onClick={handleSaveEdit} className="text-green-600"><Check size={18} /></button>
                  <button onClick={() => setEditingId(null)} className="text-red-500"><X size={18} /></button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 rounded-lg">
                      <Building2 size={18} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">{school.code}</span>
                      <span className="font-bold text-gray-700 dark:text-gray-200">{school.name}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleStartEdit(school)} className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-gray-600 rounded-lg transition-colors"><Pencil size={16} /></button>
                    <button onClick={() => onDeleteSchool(school.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-gray-600 rounded-lg transition-colors"><Trash2 size={16} /></button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
