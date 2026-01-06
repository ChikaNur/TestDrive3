
import { Team, User, Student, CourseConfig, ExamResult, CourseItem } from '../types';

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzSqFGzrgqnZagPLfLVLl_ept5UVhXjCaNdzCDdW6uVqCSNdjGAl9Ay8DS6Nt1_JPEA1g/exec";

const apiCall = async (action: string, payload: any = {}) => {
  if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes("REPLACE")) {
    throw new Error("API URL belum dikonfigurasi.");
  }
  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...payload })
    });
    
    if (!response.ok) throw new Error(`Server returned status ${response.status}`);
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data;
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error("Load failed: Pastikan script Web App diatur 'Anyone'.");
    }
    throw error;
  }
};

const mapUser = (u: any): User => ({
    ...u,
    photoUrl: u.photoUrl || u.foto || u.photo || ""
});

const mapCourseConfig = (m: any): CourseConfig => ({
    name: m.name,
    code: m.code,
    languagePriority: m.languagePriority || String(m.lang_priority || "").split(",").map((s: string) => s.trim()),
    projectType: m.project_type || "WEB",
    uiFramework: m.ui_framework || "None",
    appFramework: m.app_framework || "None",
    qtyEasy: Number(m.q_easy) || 0,
    qtyMedium: Number(m.q_medium) || 0,
    qtyHard: Number(m.q_hard) || 0,
    qtyCodingEasy: Number(m.q_code_easy) || 0,
    qtyCodingMedium: Number(m.q_code_medium) || 0,
    qtyCodingHard: Number(m.q_code_hard) || 0,
    timeOralMin: Number(m.time_oral) || 5,
    timeCodingMin: Number(m.time_code) || 15,
    weightOral: Number(m.weight_oral) || 50,
    weightCode: Number(m.weight_code) || 50,
    instrOral: m.instr_oral || "",
    instrCode: m.instr_code || "",
    aiDetailLevel: Number(m.ai_detail_level) || 2
});

export const loginUser = async (credentials: { nim?: string, kodedosen?: string, passwordHash: string, isAdmin?: boolean, isDosen?: boolean }) => {
    const res = await apiCall("login", credentials);
    return mapUser(res);
};

export const getMatakulFull = async (kodedosen?: string): Promise<any[]> => apiCall("getMatakulFull", { kodedosen });
export const getAllTeams = async (kodedosen?: string): Promise<Team[]> => apiCall("getAllTeams", { kodedosen });
export const getAllClasses = async (kodedosen?: string): Promise<any[]> => apiCall("getAllClasses", { kodedosen });
export const getUjianRekap = async (kodedosen?: string): Promise<any[]> => apiCall("getUjianRekap", { kodedosen });
export const getCourseList = async (kodedosen?: string): Promise<CourseItem[]> => apiCall("getCourseList", { kodedosen });
export const getClassList = async (courseCode: string, kodedosen?: string): Promise<string[]> => apiCall("getClassList", { courseCode, kodedosen });

export const registerUser = async (user: any) => apiCall("register", { user });
export const updateAdminPassword = async (newPasswordHash: string) => apiCall("updateAdminPassword", { newPasswordHash });
export const searchUsers = async (query: string, excludeNim?: string): Promise<User[]> => {
    const res = await apiCall("searchUsers", { query, excludeNim });
    return Array.isArray(res) ? res.map(mapUser) : [];
};
export const registerTeam = async (teamData: any) => apiCall("registerTeam", { ...teamData });
export const getStudentTeams = async (nim: string): Promise<Team[]> => apiCall("getStudentTeams", { nim });
export const saveMatakul = async (matakul: any) => apiCall("saveMatakul", { matakul });
export const deleteMatakul = async (code: string) => apiCall("deleteMatakul", { code });
export const getAllStudents = async (): Promise<User[]> => apiCall("getAllStudents");
export const deleteStudent = async (nim: string) => apiCall("deleteStudent", { nim });
export const updateTeamStatus = async (teamRef: string, isActive: boolean) => apiCall("updateTeamStatus", { teamRef, isActive });
export const getCourseConfig = async (courseName: string): Promise<CourseConfig> => {
    const res = await apiCall("getCourseConfig", { courseName });
    return mapCourseConfig(res);
};
export const submitExamResults = async (nim: string, courseCode: string, course: string, teamId: string, className: string, results: ExamResult[]) => 
    apiCall("submitExam", { nim, courseCode, course, teamId, className, results });

export const recalculateScores = async (targets: { nim: string, course_id: string }[], kodedosen?: string) => 
    apiCall("recalculateScores", { targets, kodedosen });

export const getStudentHistory = async (nim: string) => apiCall("getStudentHistory", { nim });
export const updateUserProfile = async (id: string, payload: any, role: string) => apiCall("updateProfile", { id, role, ...payload });
export const saveClass = async (courseCode: string, className: string, kodedosen: string) => apiCall("saveClass", { courseCode, className, kodedosen });
export const updateClassStatus = async (courseCode: string, className: string, isActive: boolean) => apiCall("updateClassStatus", { courseCode, className, isActive });
export const deleteClass = async (courseCode: string, className: string) => apiCall("deleteClass", { courseCode, className });
