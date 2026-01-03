
import React, { useState, useEffect, useRef } from 'react';
import { Student, AssessmentResult, Grade, Series, DrawingPhase, AssessmentType, School } from './types';
import { generateStudentReport } from './services/geminiService';
import { supabaseService } from './services/supabaseService';
import { exportToExcel } from './services/exportService';
import { importFromExcel, ImportSummary } from './services/importService';
import { DashboardChart } from './components/DashboardChart';
import { AssessmentForm } from './components/AssessmentForm';
import { StudentList } from './components/StudentList';
import { GradeManagement } from './components/GradeManagement';
import { SeriesManagement } from './components/SeriesManagement';
import { SchoolManagement } from './components/SchoolManagement';
import { ConsolidatedStudentView } from './components/ConsolidatedStudentView';
import { ReportsDashboard } from './components/ReportsDashboard';
import { TranscriptionModal } from './components/TranscriptionModal';
import {
  LayoutGrid, Users, BookOpen, FileText, Loader2, Moon, Sun,
  Settings, School as SchoolIcon, Building2,
  Layers, FileDown, FileUp,
  Cpu, Pencil, Calendar, CheckCircle2, AlertCircle, Info
} from 'lucide-react';

type ViewState = 'dashboard' | 'students' | 'reports' | 'grades' | 'series' | 'schools';

const App: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [assessments, setAssessments] = useState<AssessmentResult[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [schools, setSchools] = useState<School[]>([]);

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState<ViewState>('dashboard');

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [viewingStudentReport, setViewingStudentReport] = useState<Student | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const [showTranscriptionModal, setShowTranscriptionModal] = useState(false);
  const [studentForTranscription, setStudentForTranscription] = useState<Student | null>(null);

  // Estados para modais de resumo
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [exportCount, setExportCount] = useState<number | null>(null);

  const [newStudentData, setNewStudentData] = useState({
    code: '',
    name: '',
    birthDate: '',
    grade: '',
    series: '',
    schoolId: '',
    observations: '',
    lastPhase: '',
    lastSituation: '',
    lastAssessmentDate: ''
  });

  const [selectedModel, setSelectedModel] = useState<string>('gemini-flash-latest');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadAllData = async () => {
      try {
        const [s, a, g, ser, sc] = await Promise.all([
          supabaseService.getStudents(),
          supabaseService.getAssessments(),
          supabaseService.getGrades(),
          supabaseService.getSeries(),
          supabaseService.getSchools()
        ]);
        setStudents(s || []);
        setAssessments(a || []);
        setGrades(g || []);
        setSeriesList(ser || []);
        setSchools(sc || []);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setIsInitialLoading(false);
      }
    };
    loadAllData();
  }, []);



  const handleSaveAssessment = async (result: AssessmentResult) => {
    try {
      await supabaseService.saveAssessment(result);
      setAssessments(prev => [...prev, result]);
      setShowForm(false);
    } catch (e) {
      alert("Erro ao salvar avaliação.");
      console.error(e);
    }
  };

  const handleDeleteStudent = async (id: string, code?: string) => {
    if (window.confirm("Deseja excluir este aluno e suas sondagens permanentemente?")) {
      try {
        // Use code if available, otherwise use id (which should be the code if loaded from DB)
        const identifier = code || id;
        await supabaseService.deleteStudent(identifier);
        setStudents(prev => prev.filter(s => s.id !== id));
        setAssessments(prev => prev.filter(a => a.studentId !== id));
      } catch (e) {
        alert("Erro ao excluir aluno.");
        console.error(e);
      }
    }
  };

  const handleEditStudent = (student: Student) => {
    const lastAssessment = assessments
      .filter(a => a.studentId === student.id && a.type === AssessmentType.DRAWING)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    setEditingStudent(student);
    setNewStudentData({
      code: student.code,
      name: student.name,
      birthDate: student.birthDate,
      grade: student.grade,
      series: student.series,
      schoolId: student.schoolId || '',
      observations: student.observations || '',
      lastPhase: lastAssessment?.phase || '',
      lastSituation: lastAssessment?.situation || '',
      lastAssessmentDate: lastAssessment?.date ? lastAssessment.date.split('T')[0] : ''
    });
    setShowAddStudent(true);
  };

  const handleSaveStudent = async () => {
    try {
      if (editingStudent) {
        const updatedStudent: Student = {
          ...editingStudent,
          code: newStudentData.code,
          name: newStudentData.name,
          birthDate: newStudentData.birthDate,
          grade: newStudentData.grade,
          series: newStudentData.series,
          schoolId: newStudentData.schoolId,
          observations: newStudentData.observations
        };

        // If code changed, we need to delete the old record because code is PK
        if (editingStudent.code !== newStudentData.code) {
          await supabaseService.deleteStudent(editingStudent.code);
        }

        await supabaseService.saveStudent(updatedStudent);
        setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));

        const lastAssessment = assessments
          .filter(a => a.studentId === editingStudent.id && a.type === AssessmentType.DRAWING)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

        if (newStudentData.lastPhase) {
          const assessmentToSave: AssessmentResult = {
            id: lastAssessment?.id || crypto.randomUUID(), // Use existing ID or generate new
            studentId: updatedStudent.id,
            type: AssessmentType.DRAWING,
            phase: newStudentData.lastPhase,
            situation: newStudentData.lastSituation || undefined,
            date: newStudentData.lastAssessmentDate ? new Date(newStudentData.lastAssessmentDate).toISOString() : new Date().toISOString()
          };

          if (lastAssessment) {
            await supabaseService.saveAssessment(assessmentToSave);
            setAssessments(prev => prev.map(a => a.id === assessmentToSave.id ? assessmentToSave : a));
          } else {
            await supabaseService.saveAssessment(assessmentToSave);
            setAssessments(prev => [...prev, assessmentToSave]);
          }
        } else if (lastAssessment && !newStudentData.lastPhase) {
          // If lastPhase was removed from form, delete the last assessment
          await supabaseService.deleteAssessment(lastAssessment);
          setAssessments(prev => prev.filter(a => a.id !== lastAssessment.id));
        }

      } else {
        // Validation: Check if student code already exists
        const exists = students.some(s => s.code === newStudentData.code);
        if (exists) {
          alert("Código de Aluno Já Existe !");
          return;
        }

        const studentId = newStudentData.code; // Use code as ID for consistency with DB PK
        const newStudent: Student = {
          id: studentId,
          code: newStudentData.code,
          name: newStudentData.name,
          birthDate: newStudentData.birthDate,
          grade: newStudentData.grade,
          series: newStudentData.series,
          schoolId: newStudentData.schoolId,
          observations: newStudentData.observations
        };
        await supabaseService.saveStudent(newStudent);
        setStudents(prev => [...prev, newStudent]);

        if (newStudentData.lastPhase) {
          const newAssessment: AssessmentResult = {
            id: crypto.randomUUID(),
            studentId: studentId,
            type: AssessmentType.DRAWING,
            phase: newStudentData.lastPhase,
            situation: newStudentData.lastSituation || undefined,
            date: newStudentData.lastAssessmentDate ? new Date(newStudentData.lastAssessmentDate).toISOString() : new Date().toISOString()
          };
          await supabaseService.saveAssessment(newAssessment);
          setAssessments(prev => [...prev, newAssessment]);
        }
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar dados no banco.");
    }

    setShowAddStudent(false);
    setEditingStudent(null);
    setNewStudentData({ code: '', name: '', birthDate: '', grade: '', series: '', schoolId: '', observations: '', lastPhase: '', lastSituation: '', lastAssessmentDate: '' });
  };

  const handleSaveWritingAssessment = async (result: AssessmentResult) => {
    try {
      await supabaseService.saveAssessment(result);
      setAssessments(prev => [...prev, result]);
      setShowTranscriptionModal(false);
      setStudentForTranscription(null);
    } catch (e) {
      alert("Erro ao salvar sondagem de escrita.");
      console.error(e);
    }
  };

  const handleDeleteAll = async () => {
    if (window.confirm("ATENÇÃO: Deseja apagar TODOS os alunos do sistema?")) {
      try {
        await supabaseService.deleteAllStudents();
        setStudents([]);
        setAssessments([]);
      } catch (e) {
        alert("Erro ao apagar alunos.");
        console.error(e);
      }
    }
  };

  const generateId = () => crypto.randomUUID();

  // --- Grade Handlers ---
  const handleAddGrade = async (name: string) => {
    // Validation: Check if grade name already exists
    const exists = grades.some(g => g.name === name);
    if (exists) {
      alert("Turma Já Gravada !");
      return;
    }

    const grade: Grade = { id: name, name };
    await supabaseService.saveGrades([grade]);
    setGrades(prev => [...prev, grade]);
  };
  const handleUpdateGrade = async (id: string, newName: string) => {
    if (id !== newName) {
      await supabaseService.deleteGrade(id);
    }
    const grade = { id: newName, name: newName };
    await supabaseService.saveGrades([grade]);
    setGrades(prev => prev.map(g => g.id === id ? grade : g));
  };
  const handleDeleteGrade = async (id: string) => {
    // Check if any student is associated with this grade (turma)
    const hasStudent = students.some(s => s.grade === id);
    if (hasStudent) {
      alert("Não posso apagar esta turma porque tem aluno associado a ela");
      return;
    }
    await supabaseService.deleteGrade(id);
    setGrades(prev => prev.filter(g => g.id !== id));
  };

  // --- Series Handlers ---
  const handleAddSeries = async (name: string) => {
    // Validation: Check if series name already exists
    const exists = seriesList.some(s => s.name === name);
    if (exists) {
      alert("Série Já Gravada !");
      return;
    }

    const series: Series = { id: name, name };
    await supabaseService.saveSeries([series]);
    setSeriesList(prev => [...prev, series]);
  };
  const handleUpdateSeries = async (id: string, newName: string) => {
    if (id !== newName) {
      await supabaseService.deleteSeries(id);
    }
    const series = { id: newName, name: newName };
    await supabaseService.saveSeries([series]);
    setSeriesList(prev => prev.map(s => s.id === id ? series : s));
  };
  const handleDeleteSeries = async (id: string) => {
    // Check if any student is associated with this series
    const hasStudent = students.some(s => s.series === id);
    if (hasStudent) {
      alert("Não posso apagar esta série porque tem aluno associado a ela");
      return;
    }
    await supabaseService.deleteSeries(id);
    setSeriesList(prev => prev.filter(s => s.id !== id));
  };

  // --- School Handlers ---
  const handleAddSchool = async (code: string, name: string) => {
    // Validation: Check if school code already exists
    const exists = schools.some(s => s.code === code);
    if (exists) {
      alert("Código de Escola Já Existe !");
      return;
    }

    const school: School = { id: code, code, name };
    await supabaseService.saveSchools([school]);
    setSchools(prev => [...prev, school]);
  };
  const handleUpdateSchool = async (id: string, code: string, name: string) => {
    if (id !== code) {
      await supabaseService.deleteSchool(id);
    }
    const school = { id: code, code, name };
    await supabaseService.saveSchools([school]);
    setSchools(prev => prev.map(s => s.id === id ? school : s));
  };
  const handleDeleteSchool = async (id: string) => {
    // Check if any student is associated with this school
    const hasStudent = students.some(s => s.schoolId === id);
    if (hasStudent) {
      alert("Não posso apagar esta escola porque tem aluno associado a ela");
      return;
    }
    await supabaseService.deleteSchool(id);
    setSchools(prev => prev.filter(s => s.id !== id));
  };

  const handleExportData = () => {
    document.body.style.cursor = 'wait';
    try {
      exportToExcel(students, seriesList, grades, schools, assessments);
      setExportCount(students.length);
    } finally {
      document.body.style.cursor = 'default';
    }
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsSyncing(true);
    document.body.style.cursor = 'wait';
    try {
      const summary = await importFromExcel(file, { students, series: seriesList, grades, schools, assessments });
      setStudents(summary.data.students);
      setSeriesList(summary.data.series);
      setGrades(summary.data.grades);
      setAssessments(summary.data.assessments);
      if (summary.data.schools) setSchools(summary.data.schools);

      // Save all imported data to Supabase
      // Use efficient parallel saving if possible or sequential
      await Promise.all([
        supabaseService.saveStudents(summary.data.students),
        supabaseService.saveSeries(summary.data.series),
        supabaseService.saveGrades(summary.data.grades),
        supabaseService.saveSchools(summary.data.schools)
      ]);
      // Note: assessments are implicitly saved if they are part of student 'fase' columns?
      // Import strategy for assessments needs verification.
      // If importService returns assessments separately, we need to save them.
      // importService returns 'assessments' in summary.data.
      if (summary.data.assessments.length > 0) {
        await supabaseService.saveAssessments(summary.data.assessments);
      }

      alert(`Importação concluída!\n\n${summary.summary}`);
    } catch (error) {
      console.error("Erro na importação:", error);
      alert("Erro ao importar arquivo excel. Verifique o formato.");
    } finally {
      setIsSyncing(false);
      document.body.style.cursor = 'default';
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleGenerateReport = async (student: Student) => {
    const studentAssessments = assessments.filter(a => a.studentId === student.id);
    if (studentAssessments.length === 0) return alert("Realize uma sondagem primeiro.");
    setReportLoading(true);
    try {
      await generateStudentReport(selectedModel, student.name, studentAssessments);
      alert("Relatório gerado!");
    } catch (e) {
      alert("Erro ao gerar relatório.");
    } finally {
      setReportLoading(false);
    }
  };

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-[#fdfbf7] flex flex-col items-center justify-center">
        <Loader2 size={48} className="text-orange-600 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-gray-700">Carregando Banco de Dados...</h2>
      </div>
    );
  }

  const getViewTitle = (view: ViewState) => {
    switch (view) {
      case 'dashboard': return 'Visão Geral';
      case 'students': return 'Alunos';
      case 'reports': return 'Relatórios';
      case 'grades': return 'Turmas';
      case 'series': return 'Séries';
      case 'schools': return 'Escolas';
      default: return view;
    }
  };

  return (
    <div className={isDarkMode ? "dark" : ""}>
      <div className="min-h-screen flex bg-[#fdfbf7] dark:bg-gray-900 transition-colors duration-300">
        <aside className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 z-20 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} transition-transform duration-300`}>
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <h1 className="text-xl font-extrabold text-orange-600 flex items-center gap-2"><BookOpen size={24} /> PedagogIA</h1>
          </div>
          <div className="p-4 flex-1 overflow-y-auto space-y-1">
            <button onClick={() => setActiveView('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium ${activeView === 'dashboard' ? 'bg-orange-50 text-orange-600' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}><LayoutGrid size={20} /> Painel</button>
            <button onClick={() => setActiveView('series')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium ${activeView === 'series' ? 'bg-orange-50 text-orange-600' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}><Layers size={20} /> Séries</button>
            <button onClick={() => setActiveView('schools')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium ${activeView === 'schools' ? 'bg-orange-50 text-orange-600' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}><Building2 size={20} /> Escolas</button>
            <button onClick={() => setActiveView('grades')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium ${activeView === 'grades' ? 'bg-orange-50 text-orange-600' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}><SchoolIcon size={20} /> Turmas</button>
            <button onClick={() => setActiveView('students')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium ${activeView === 'students' ? 'bg-orange-50 text-orange-600' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}><Users size={20} /> Alunos</button>
            <button onClick={() => setActiveView('reports')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium ${activeView === 'reports' ? 'bg-orange-50 text-orange-600' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}><FileText size={20} /> Relatórios</button>

            <div className="pt-4 mt-4 border-t dark:border-gray-700 space-y-1">
              <button onClick={handleExportData} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-indigo-600 hover:bg-indigo-50 transition-all"><FileDown size={20} /> Exportar</button>
              <button onClick={handleImportClick} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-emerald-600 hover:bg-emerald-50 transition-all"><FileUp size={20} /> Importar</button>
              <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileChange} />
            </div>
          </div>
          <div className="p-4 border-t dark:border-gray-700">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700">{isDarkMode ? <Sun size={20} /> : <Moon size={20} />} {isDarkMode ? 'Claro' : 'Escuro'}</button>
            <button onClick={() => setShowSettings(true)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"><Settings size={20} /> Configurações</button>
          </div>
        </aside>

        <main className="flex-1 p-8">
          <header className="flex justify-between items-center mb-8 max-w-6xl mx-auto no-print">
            <div>
              <h2 className="text-2xl font-black text-gray-800 dark:text-white">{getViewTitle(activeView)}</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Gestão Pedagógica com Inteligência Artificial</p>
            </div>

            <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-2 rounded-2xl shadow-sm border dark:border-gray-700">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 rounded-lg">
                <Cpu size={18} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">IA Inteligência</span>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="bg-transparent border-none p-0 text-sm font-bold text-gray-700 dark:text-gray-200 focus:ring-0 cursor-pointer"
                >
                  <option value="gemini-flash-latest">Gemini Flash Latest (Estável)</option>
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash (Mais Rápido)</option>
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                  <option value="gemini-3-flash-preview">Gemini 3 Flash Preview</option>
                  <option value="gemini-3-pro-preview">Gemini 3 Pro Preview</option>
                  <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash (Experimental)</option>
                </select>
              </div>
            </div>
          </header>

          <div className="max-w-6xl mx-auto">
            {activeView === 'dashboard' && <DashboardChart assessments={assessments} students={students} schools={schools} />}
            {activeView === 'grades' && <GradeManagement grades={grades} onAddGrade={handleAddGrade} onUpdateGrade={handleUpdateGrade} onDeleteGrade={handleDeleteGrade} />}
            {activeView === 'series' && <SeriesManagement seriesList={seriesList} onAddSeries={handleAddSeries} onUpdateSeries={handleUpdateSeries} onDeleteSeries={handleDeleteSeries} />}
            {activeView === 'schools' && <SchoolManagement schools={schools} onAddSchool={handleAddSchool} onUpdateSchool={handleUpdateSchool} onDeleteSchool={handleDeleteSchool} />}
            {activeView === 'students' && (
              <StudentList
                students={students}
                assessments={assessments}
                schools={schools}
                onSelectStudent={(s) => { setSelectedStudent(s); setShowForm(true); }}
                onStartTranscription={(s) => { setStudentForTranscription(s); setShowTranscriptionModal(true); }}
                onEditStudent={handleEditStudent}
                onGenerateReport={handleGenerateReport}
                onAddStudent={() => { setEditingStudent(null); setNewStudentData({ code: '', name: '', birthDate: '', grade: '', series: '', schoolId: '', observations: '', lastPhase: '', lastSituation: '', lastAssessmentDate: '' }); setShowAddStudent(true); }}
                onDeleteStudent={handleDeleteStudent}
                onDeleteAllStudents={handleDeleteAll}
              />
            )}
            {activeView === 'reports' && (
              viewingStudentReport ? (
                <ConsolidatedStudentView
                  student={viewingStudentReport}
                  assessments={assessments}
                  onBack={() => setViewingStudentReport(null)}
                />
              ) : (
                <ReportsDashboard
                  students={students}
                  assessments={assessments}
                  schools={schools}
                  onViewReport={(student) => setViewingStudentReport(student)}
                  onEditStudent={handleEditStudent}
                />
              )
            )}
          </div>
        </main>
      </div>

      {showForm && selectedStudent && <AssessmentForm student={selectedStudent} onSave={handleSaveAssessment} onCancel={() => setShowForm(false)} selectedModel={selectedModel} />}

      {showTranscriptionModal && studentForTranscription && (
        <TranscriptionModal
          student={studentForTranscription}
          onClose={() => setShowTranscriptionModal(false)}
          onSave={handleSaveWritingAssessment}
          selectedModel={selectedModel}
        />
      )}

      {showAddStudent && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-3xl p-8 shadow-2xl animate-fade-in overflow-y-auto max-h-[95vh]">
            <div className="flex items-center gap-3 mb-6">
              <div className={`p-2 rounded-xl ${editingStudent ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                {editingStudent ? <Pencil size={24} /> : <Users size={24} />}
              </div>
              <h3 className="text-xl font-black dark:text-white">{editingStudent ? 'Alterar Cadastro Completo' : 'Novo Aluno'}</h3>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b pb-2">Dados Cadastrais</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Código do Aluno</label>
                    <input type="text" placeholder="Código" className="w-full p-3 border rounded-xl dark:bg-gray-900 dark:border-gray-700 outline-none focus:ring-2 focus:ring-orange-500" value={newStudentData.code} onChange={(e) => setNewStudentData({ ...newStudentData, code: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Data de Nascimento</label>
                    <input type="date" className="w-full p-3 border rounded-xl dark:bg-gray-900 dark:border-gray-700 outline-none focus:ring-2 focus:ring-orange-500" value={newStudentData.birthDate} onChange={(e) => setNewStudentData({ ...newStudentData, birthDate: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Nome Completo</label>
                  <input type="text" placeholder="Nome Completo" className="w-full p-3 border rounded-xl dark:bg-gray-900 dark:border-gray-700 outline-none focus:ring-2 focus:ring-orange-500" value={newStudentData.name} onChange={(e) => setNewStudentData({ ...newStudentData, name: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Escola</label>
                  <select className="w-full p-3 border rounded-xl dark:bg-gray-900 dark:border-gray-700 outline-none focus:ring-2 focus:ring-orange-500" value={newStudentData.schoolId} onChange={(e) => setNewStudentData({ ...newStudentData, schoolId: e.target.value })}>
                    <option value="">Selecione a Escola...</option>
                    {schools.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Série</label>
                    <select className="w-full p-3 border rounded-xl dark:bg-gray-900 dark:border-gray-700 outline-none focus:ring-2 focus:ring-orange-500" value={newStudentData.series} onChange={(e) => setNewStudentData({ ...newStudentData, series: e.target.value })}>
                      <option value="">Selecione a Série...</option>
                      {seriesList.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Turma</label>
                    <select className="w-full p-3 border rounded-xl dark:bg-gray-900 dark:border-gray-700 outline-none focus:ring-2 focus:ring-orange-500" value={newStudentData.grade} onChange={(e) => setNewStudentData({ ...newStudentData, grade: e.target.value })}>
                      <option value="">Selecione a Turma...</option>
                      {grades.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-4 bg-orange-50/50 dark:bg-gray-900/50 rounded-2xl border border-orange-100 dark:border-gray-700">
                <h4 className="text-xs font-black text-orange-800 dark:text-orange-400 uppercase tracking-widest border-b border-orange-200 dark:border-gray-700 pb-2 flex items-center gap-2">
                  <FileText size={14} /> Classificação Pedagógica (Sondagem)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Fase do Desenho</label>
                    <select className="w-full p-3 border rounded-xl dark:bg-gray-900 dark:border-gray-700 outline-none focus:ring-2 focus:ring-orange-500" value={newStudentData.lastPhase} onChange={(e) => setNewStudentData({ ...newStudentData, lastPhase: e.target.value })}>
                      <option value="">Não Classificado</option>
                      {Object.values(DrawingPhase).map(phase => <option key={phase} value={phase}>{phase}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Situação</label>
                    <select className="w-full p-3 border rounded-xl dark:bg-gray-900 dark:border-gray-700 outline-none focus:ring-2 focus:ring-orange-500" value={newStudentData.lastSituation} onChange={(e) => setNewStudentData({ ...newStudentData, lastSituation: e.target.value })}>
                      <option value="">Cálculo Automático (Idade x Fase)</option>
                      <option value="Normal">Normal</option>
                      <option value="Atrasado">Atrasado</option>
                      <option value="Adiantado">Adiantado</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Data da Última Sondagem</label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="date" className="w-full p-3 pl-10 border rounded-xl dark:bg-gray-900 dark:border-gray-700 outline-none focus:ring-2 focus:ring-orange-500" value={newStudentData.lastAssessmentDate} onChange={(e) => setNewStudentData({ ...newStudentData, lastAssessmentDate: e.target.value })} />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Observações Pedagógicas Gerais</label>
                <textarea
                  rows={3}
                  placeholder="Digite observações gerais sobre o aluno..."
                  className="w-full p-3 border rounded-xl dark:bg-gray-900 dark:border-gray-700 outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  value={newStudentData.observations}
                  onChange={(e) => setNewStudentData({ ...newStudentData, observations: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => { setShowAddStudent(false); setEditingStudent(null); }} className="flex-1 py-4 text-gray-500 font-bold hover:bg-gray-50 rounded-2xl transition-all">Cancelar</button>
              <button onClick={handleSaveStudent} className={`flex-1 py-4 text-white rounded-2xl font-black shadow-lg transition-all active:scale-95 ${editingStudent ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-600 hover:bg-orange-700'}`}>
                {editingStudent ? 'Salvar Alterações' : 'Cadastrar Aluno'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Resumo da Importação */}
      {importSummary && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl p-8 shadow-2xl animate-fade-in text-center">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-xl font-black dark:text-white mb-2">Importação Concluída</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">O arquivo foi processado com sucesso.</p>

            <div className="space-y-3 mb-8">
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900 rounded-xl">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total no Arquivo</span>
                <span className="font-black dark:text-white">{importSummary.totalRows}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Adicionados</span>
                <span className="font-black text-emerald-600">{importSummary.addedStudentsCount}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">Ignorados (Duplicados)</span>
                <span className="font-black text-orange-600">{importSummary.skippedStudentsCount}</span>
              </div>
            </div>

            <button
              onClick={() => setImportSummary(null)}
              className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black shadow-lg transition-all"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Modal de Resumo da Exportação */}
      {exportCount !== null && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl p-8 shadow-2xl animate-fade-in text-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/40 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileDown size={32} />
            </div>
            <h3 className="text-xl font-black dark:text-white mb-2">Arquivo Gerado</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Seus dados foram exportados para Excel.</p>

            <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-2xl mb-8">
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Alunos Exportados</p>
              <h4 className="text-4xl font-black text-blue-800 dark:text-blue-300">{exportCount}</h4>
            </div>

            <button
              onClick={() => setExportCount(null)}
              className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black shadow-lg transition-all"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {reportLoading && (
        <div className="fixed inset-0 bg-white/80 dark:bg-gray-900/80 z-[60] flex flex-col items-center justify-center">
          <Loader2 size={48} className="text-orange-600 animate-spin mb-4" />
          <h3 className="text-xl font-bold">Gerando Relatório...</h3>
        </div>
      )}
    </div>
  );
};

export default App;
