
import React, { useState } from 'react';
import { Grade } from '../types';
import { Plus, Pencil, Trash2, School, X, Check } from 'lucide-react';

interface Props {
  grades: Grade[];
  onAddGrade: (name: string) => void;
  onUpdateGrade: (id: string, newName: string) => void;
  onDeleteGrade: (id: string) => void;
}

export const GradeManagement: React.FC<Props> = ({ grades, onAddGrade, onUpdateGrade, onDeleteGrade }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newGradeName, setNewGradeName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleSaveNew = () => {
    if (newGradeName.trim()) {
      onAddGrade(newGradeName.trim());
      setNewGradeName('');
      setIsAdding(false);
    }
  };

  const handleStartEdit = (grade: Grade) => {
    setEditingId(grade.id);
    setEditingName(grade.name);
  };

  const handleSaveEdit = () => {
    if (editingId && editingName.trim()) {
      onUpdateGrade(editingId, editingName.trim());
      setEditingId(null);
      setEditingName('');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-orange-100 dark:border-gray-700 overflow-hidden animate-fade-in">
      <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
        <h3 className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
          <School size={20} className="text-orange-500" />
          Gerenciar Turmas
        </h3>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus size={16} />
          Nova Turma
        </button>
      </div>

      <div className="p-6">
        {isAdding && (
          <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-xl flex items-center gap-3 animate-fade-in">
            <input 
              autoFocus
              type="text" 
              placeholder="Nome da Turma (ex: Infantil 4 A)"
              className="flex-1 p-2 border rounded-lg dark:bg-gray-900 dark:text-white dark:border-gray-700 outline-none focus:ring-2 focus:ring-orange-500"
              value={newGradeName}
              onChange={(e) => setNewGradeName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveNew()}
            />
            <button onClick={handleSaveNew} className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"><Check size={20} /></button>
            <button onClick={() => setIsAdding(false)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"><X size={20} /></button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {grades.length === 0 && !isAdding && (
            <div className="col-span-full py-12 text-center text-gray-400 italic">
              Nenhuma turma cadastrada. Adicione turmas para organizar seus alunos.
            </div>
          )}
          
          {grades.map(grade => (
            <div key={grade.id} className="p-4 bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-xl shadow-sm flex items-center justify-between group hover:border-orange-200 transition-all">
              {editingId === grade.id ? (
                <div className="flex items-center gap-2 w-full">
                  <input 
                    autoFocus
                    type="text"
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
                      <School size={18} />
                    </div>
                    <span className="font-bold text-gray-700 dark:text-gray-200">{grade.name}</span>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleStartEdit(grade)} className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-gray-600 rounded-lg transition-colors"><Pencil size={16} /></button>
                    <button onClick={() => onDeleteGrade(grade.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-gray-600 rounded-lg transition-colors"><Trash2 size={16} /></button>
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
