
/**
 * Uji CodingMu - Backend Google Apps Script
 * Versi: 4.4.3 (Admin Profile in Setting Sheet)
 */

const SPREADSHEET_ID = ""; 

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ 
    status: "online", 
    message: "Uji CodingMu API is active."
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(15000);

  try {
    if (!e.postData.contents) throw new Error("No post data received");
    const params = JSON.parse(e.postData.contents);
    const action = params.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Pastikan Sheet Tersedia
    const usersSheet = ensureSheet(ss, "Users", ["nim", "name", "password", "photo", "nowa"]);
    const dosenSheet = ensureSheet(ss, "Dosen", ["kodedosen", "nama", "password", "foto"]);
    const teamsSheet = ensureSheet(ss, "Teams", ["id", "course", "class", "no_tim", "project_title", "nim", "name", "leader_flag", "ujian_start"]);
    const matakulSheet = ensureSheet(ss, "Matakul", ["code", "name", "lang_priority", "project_type", "ui_framework", "app_framework", "q_easy", "q_medium", "q_hard", "q_code_easy", "q_code_medium", "q_code_hard", "time_oral", "time_code", "weight_oral", "weight_code", "instr_oral", "instr_code", "ai_detail_level"]);
    const kelasSheet = ensureSheet(ss, "Kelas", ["course_code", "class_name", "is_active", "kodedosen"]);
    const settingSheet = ensureSheet(ss, "Setting", ["parameter", "value"]);
    const examSheet = ensureSheet(ss, "Ujian", ["nim", "course", "course_id", "class", "team", "score_oral", "score_code", "score_total", "details_json"]);

    const allUsers = getData(usersSheet);
    const userMasterMap = {}; 
    allUsers.forEach(u => { if (u.nim) userMasterMap[String(u.nim).trim()] = { name: u.name, photo: u.photo }; });

    // SHA-256 of "2311"
    const DEFAULT_ADMIN_PASS_HASH = "d64a2f3478b0568019742a17058a97f26c92d54406a46328229b47565786f45a";
    let storedAdminPass = getSetting(settingSheet, "admin_password", DEFAULT_ADMIN_PASS_HASH);

    let result = {};
    const kdFilter = params.kodedosen ? String(params.kodedosen).trim().toLowerCase() : null;

    switch(action) {
      // --- AUTH & USER SECTION ---
      case "login":
        if (params.isAdmin) {
           if (String(params.passwordHash).trim() === storedAdminPass) {
               const adminPhoto = getSetting(settingSheet, "fotoadmin", "");
               result = { nim: 'admin', name: 'Admin Ko+Lab', role: 'ADMIN', photoUrl: adminPhoto };
           } else throw new Error("Password Administrator tidak valid.");
        } else if (params.isDosen) {
           const dsList = getData(dosenSheet);
           const ds = dsList.find(d => String(d.kodedosen || "").trim().toLowerCase() === String(params.kodedosen || "").trim().toLowerCase());
           if (ds && String(ds.password).trim() === String(params.passwordHash).trim()) {
              result = { kodedosen: ds.kodedosen, name: ds.nama, role: 'DOSEN', photoUrl: ds.foto || "" };
           } else throw new Error("Kode Dosen atau Password salah.");
        } else {
           const stu = allUsers.find(u => String(u.nim).trim() === String(params.nim).trim());
           if (stu && String(stu.password).trim() === String(params.passwordHash).trim()) {
              result = { nim: stu.nim, name: stu.name, role: 'STUDENT', photoUrl: stu.photo || "" };
           } else throw new Error("NIM atau Password salah.");
        }
        break;

      case "updateProfile":
        const targetId = String(params.id || params.nim);
        const role = params.role || 'STUDENT';
        
        if (role === 'ADMIN') {
          if (params.passwordHash) upsertSetting(settingSheet, "admin_password", params.passwordHash);
          if (params.photo) upsertSetting(settingSheet, "fotoadmin", params.photo);
        } else if (role === 'DOSEN') {
          const dsRows = dosenSheet.getDataRange().getValues();
          for (let i = 1; i < dsRows.length; i++) {
            if (String(dsRows[i][0]).toLowerCase() === targetId.toLowerCase()) {
              if (params.passwordHash) dosenSheet.getRange(i+1, 3).setValue(params.passwordHash);
              if (params.photo) dosenSheet.getRange(i+1, 4).setValue(params.photo);
              break;
            }
          }
        } else {
          const upRows = usersSheet.getDataRange().getValues();
          for (let i = 1; i < upRows.length; i++) {
            if (String(upRows[i][0]) === targetId) {
              if (params.passwordHash) usersSheet.getRange(i+1, 3).setValue(params.passwordHash);
              if (params.photo) usersSheet.getRange(i+1, 4).setValue(params.photo);
              break;
            }
          }
        }
        result = { status: "success" };
        break;

      case "register":
        const uObj = params.user;
        if (allUsers.some(u => String(u.nim) === String(uObj.nim))) throw new Error("NIM sudah terdaftar.");
        usersSheet.appendRow([uObj.nim, uObj.name, uObj.password, uObj.photo, uObj.nowa]);
        result = { status: "success" };
        break;

      case "searchUsers":
        const q = String(params.query || "").toLowerCase();
        const exNim = String(params.excludeNim || "").toLowerCase();
        result = allUsers.filter(u => {
          const nim = String(u.nim || "").toLowerCase();
          const name = String(u.name || "").toLowerCase();
          return (nim.includes(q) || name.includes(q)) && nim !== exNim;
        }).slice(0, 10).map(u => ({ nim: u.nim, name: u.name, photoUrl: u.photo }));
        break;

      case "getAllStudents":
        result = allUsers.map(u => ({ nim: u.nim, name: u.name, nowa: u.nowa, photoUrl: u.photo }));
        break;

      case "deleteStudent":
        const dsVal = usersSheet.getDataRange().getValues();
        for (let i = 1; i < dsVal.length; i++) {
          if (String(dsVal[i][0]) === String(params.nim)) {
            usersSheet.deleteRow(i + 1);
            break;
          }
        }
        result = { status: "success" };
        break;

      // --- MATAKULIAH SECTION ---
      case "getMatakulFull":
        let allM = getData(matakulSheet);
        if (kdFilter) {
          const myCourseCodes = getData(kelasSheet)
            .filter(c => String(c.kodedosen || "").trim().toLowerCase() === kdFilter)
            .map(c => String(c.course_code || "").trim().toLowerCase());
          const uniqueCodes = [...new Set(myCourseCodes)];
          allM = allM.filter(m => uniqueCodes.includes(String(m.code || "").trim().toLowerCase()));
        }
        result = allM;
        break;

      case "getCourseConfig":
        const mksConfig = getData(matakulSheet);
        const cfg = mksConfig.find(m => String(m.name).toLowerCase() === String(params.courseName).toLowerCase() || String(m.code).toLowerCase() === String(params.courseName).toLowerCase());
        if (!cfg) throw new Error("Konfigurasi mata kuliah tidak ditemukan.");
        result = cfg;
        break;

      case "saveMatakul":
        const headersM = ["code", "name", "lang_priority", "project_type", "ui_framework", "app_framework", "q_easy", "q_medium", "q_hard", "q_code_easy", "q_code_medium", "q_code_hard", "time_oral", "time_code", "weight_oral", "weight_code", "instr_oral", "instr_code", "ai_detail_level"];
        upsertRow(matakulSheet, headersM, params.matakul, 0);
        result = { status: "success" };
        break;

      case "deleteMatakul":
        const dmRows = matakulSheet.getDataRange().getValues();
        for (let i = 1; i < dmRows.length; i++) {
          if (String(dmRows[i][0]).toLowerCase() === String(params.code).toLowerCase()) {
            matakulSheet.deleteRow(i + 1);
            break;
          }
        }
        result = { status: "success" };
        break;

      // --- TEAM SECTION ---
      case "registerTeam":
        params.members.forEach(m => {
          teamsSheet.appendRow([
            params.courseCode, 
            params.courseName, 
            params.className, 
            params.noTim, 
            params.projectTitle, 
            m.nim, 
            m.name, 
            String(m.nim) === String(params.leaderNim) ? 1 : 0, 
            0
          ]);
        });
        result = { status: "success" };
        break;

      case "getAllTeams":
        const tms = getData(teamsSheet);
        const exs = getData(examSheet);
        let allowedKls = null;
        if (kdFilter) {
          allowedKls = getData(kelasSheet)
            .filter(c => String(c.kodedosen || "").trim().toLowerCase() === kdFilter)
            .map(c => `${String(c.course_code || "").trim().toLowerCase()}|${String(c.class_name || "").trim().toLowerCase()}`);
        }
        const groups = {};
        tms.forEach(r => {
          const courseClassKey = `${String(r.id || "").trim().toLowerCase()}|${String(r.class || "").trim().toLowerCase()}`;
          if (allowedKls && !allowedKls.includes(courseClassKey)) return;
          const k = `${r.id}|${r.class}|${r.no_tim}`;
          if (!groups[k]) groups[k] = { id: r.id, course: r.course, className: r.class, name: r.no_tim, projectTitle: r.project_title, team_ref: k, isActive: parseInt(r.ujian_start) === 1, members: [] };
          const e = exs.find(ex => String(ex.nim) === String(r.nim) && String(ex.course_id) === String(r.id));
          groups[k].members.push({ nim: r.nim, name: userMasterMap[String(r.nim).trim()]?.name || r.name, grades: e ? { scoreTotal: e.score_total } : null });
        });
        result = Object.values(groups);
        break;

      case "updateTeamStatus":
        const pT = params.teamRef.split("|");
        const rowsT = teamsSheet.getDataRange().getValues();
        for (let i = 1; i < rowsT.length; i++) { 
          if (String(rowsT[i][0]) === pT[0] && String(rowsT[i][2]) === pT[1] && String(rowsT[i][3]) === pT[2]) {
            teamsSheet.getRange(i + 1, 9).setValue(params.isActive ? 1 : 0); 
          }
        }
        result = { status: "success" };
        break;

      // --- CLASS SECTION ---
      case "getAllClasses":
        let klsAll = getData(kelasSheet);
        if (kdFilter) klsAll = klsAll.filter(c => String(c.kodedosen || "").trim().toLowerCase() === kdFilter);
        result = klsAll;
        break;
        
      case "saveClass":
        kelasSheet.appendRow([params.courseCode, params.className, 1, params.kodedosen || ""]);
        result = { status: "success" };
        break;

      case "updateClassStatus":
        const ucRows = kelasSheet.getDataRange().getValues();
        for (let i = 1; i < ucRows.length; i++) {
          if (String(ucRows[i][0]) === String(params.courseCode) && String(ucRows[i][1]) === String(params.className)) {
            kelasSheet.getRange(i + 1, 3).setValue(params.isActive ? 1 : 0);
            break;
          }
        }
        result = { status: "success" };
        break;

      case "deleteClass":
        const dcRows = kelasSheet.getDataRange().getValues();
        for (let i = 1; i < dcRows.length; i++) {
          if (String(dcRows[i][0]) === String(params.courseCode) && String(dcRows[i][1]) === String(params.className)) {
            kelasSheet.deleteRow(i + 1);
            break;
          }
        }
        result = { status: "success" };
        break;

      // --- EXAM & RESULTS SECTION ---
      case "submitExam":
        const mksList = getData(matakulSheet);
        const courseInfo = mksList.find(m => String(m.code).toLowerCase() === String(params.courseCode).toLowerCase());
        
        const wOral = Number(courseInfo?.weight_oral || 50) / 100;
        const wCode = Number(courseInfo?.weight_code || 50) / 100;
        
        const oralResults = params.results.filter(r => r.type === 'ORAL');
        const codeResults = params.results.filter(r => r.type === 'CODING');
        
        const avgOral = oralResults.length ? oralResults.reduce((a,b) => a+b.score, 0) / oralResults.length : 0;
        const avgCode = codeResults.length ? codeResults.reduce((a,b) => a+b.score, 0) / codeResults.length : 0;
        
        const scoreTotal = Math.round((avgOral * wOral) + (avgCode * wCode));

        examSheet.appendRow([
          params.nim, 
          params.course, 
          params.courseCode, 
          params.className, 
          params.teamId, 
          avgOral,
          avgCode,
          scoreTotal, 
          JSON.stringify(params.results)
        ]);
        result = { status: "success" };
        break;

      case "recalculateScores":
        const mksForRecalc = getData(matakulSheet);
        const examDataRaw = examSheet.getDataRange().getValues();
        const examHeaders = examDataRaw[0].map(h => String(h).toLowerCase().trim());
        const nimI = examHeaders.indexOf("nim");
        const cidI = examHeaders.indexOf("course_id");
        const oralI = examHeaders.indexOf("score_oral");
        const codeI = examHeaders.indexOf("score_code");
        const totalI = examHeaders.indexOf("score_total");
        
        const targets = params.targets; // Array of { nim, course_id }
        let updatedCount = 0;
        
        targets.forEach(target => {
          for (let i = 1; i < examDataRaw.length; i++) {
            if (String(examDataRaw[i][nimI]) === String(target.nim) && 
                String(examDataRaw[i][cidI]) === String(target.course_id)) {
              
              const mInfo = mksForRecalc.find(m => String(m.code).toLowerCase() === String(target.course_id).toLowerCase());
              if (mInfo) {
                const weightOral = Number(mInfo.weight_oral || 50) / 100;
                const weightCode = Number(mInfo.weight_code || 50) / 100;
                const sOral = Number(examDataRaw[i][oralI]) || 0;
                const sCode = Number(examDataRaw[i][codeI]) || 0;
                const newTotal = Math.round((sOral * weightOral) + (sCode * weightCode));
                
                examSheet.getRange(i + 1, totalI + 1).setValue(newTotal);
                updatedCount++;
              }
              break;
            }
          }
        });
        result = { status: "success", updatedCount };
        break;

      case "getUjianRekap":
        let exams = getData(examSheet);
        if (kdFilter) {
          const myKls = getData(kelasSheet)
            .filter(c => String(c.kodedosen || "").trim().toLowerCase() === kdFilter)
            .map(c => `${String(c.course_code || "").trim().toLowerCase()}|${String(c.class_name || "").trim().toLowerCase()}`);
          exams = exams.filter(e => myKls.includes(`${String(e.course_id || "").trim().toLowerCase()}|${String(e.class || "").trim().toLowerCase()}`));
        }
        result = exams.map(e => ({ ...e, name: userMasterMap[String(e.nim).trim()]?.name || e.nim }));
        break;

      case "getCourseList":
        let mksBase = getData(matakulSheet);
        if (kdFilter) {
          const myMks = getData(kelasSheet)
            .filter(c => String(c.kodedosen || "").trim().toLowerCase() === kdFilter)
            .map(c => String(c.course_code || "").trim().toLowerCase());
          const uniqueMks = [...new Set(myMks)];
          mksBase = mksBase.filter(m => uniqueMks.includes(String(m.code || "").trim().toLowerCase()));
        }
        result = mksBase.map(it => ({ code: it.code, name: it.name }));
        break;
        
      case "getClassList":
        let clsList = getData(kelasSheet).filter(c => String(c.course_code || "").trim().toLowerCase() === String(params.courseCode || "").trim().toLowerCase() && parseInt(c.is_active) === 1);
        if (kdFilter) clsList = clsList.filter(c => String(c.kodedosen || "").trim().toLowerCase() === kdFilter);
        result = clsList.map(c => c.class_name);
        break;

      case "getStudentTeams":
        const stTms = getData(teamsSheet);
        const stExs = getData(examSheet);
        const myKeys = stTms.filter(r => String(r.nim).trim() === String(params.nim).trim()).map(r => `${r.id}|${r.class}|${r.no_tim}`);
        const stGroups = {};
        stTms.forEach(r => {
          const k = `${r.id}|${r.class}|${r.no_tim}`;
          if (!myKeys.includes(k)) return;
          if (!stGroups[k]) stGroups[k] = { id: r.id, course: r.course, className: r.class, name: r.no_tim, projectTitle: r.project_title, team_ref: k, isActive: parseInt(r.ujian_start) === 1, members: [] };
          const e = stExs.find(ex => String(ex.nim) === String(r.nim) && String(ex.course_id) === String(r.id));
          stGroups[k].members.push({ nim: r.nim, name: userMasterMap[String(r.nim).trim()]?.name || r.name, grades: e ? { scoreTotal: e.score_total } : null });
        });
        result = Object.values(stGroups);
        break;

      case "getStudentHistory":
        result = getData(examSheet).filter(e => String(e.nim).trim() === String(params.nim).trim());
        break;

      default:
        throw new Error("Action tidak dikenali: " + action);
    }

    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ error: e.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally { lock.releaseLock(); }
}

function ensureSheet(ss, name, headers) {
  let s = ss.getSheetByName(name);
  if (!s) { s = ss.insertSheet(name); s.appendRow(headers); s.getRange(1,1,1,headers.length).setFontWeight("bold").setBackground("#f3f3f3"); }
  return s;
}

function getData(sheet) {
  const v = sheet.getDataRange().getValues();
  if (v.length < 2) return [];
  const h = v[0].map(it => String(it).toLowerCase().trim());
  return v.slice(1).map(row => {
    let o = {};
    h.forEach((key, i) => o[key] = row[i]);
    return o;
  });
}

function getSetting(sheet, parameter, def) {
  const d = getData(sheet);
  const it = d.find(s => String(s.parameter || "").trim() === parameter);
  return it ? String(it.value) : def;
}

function upsertSetting(sheet, parameter, value) {
  const d = sheet.getDataRange().getValues();
  let found = false;
  for (let i = 1; i < d.length; i++) {
    if (String(d[i][0]) === parameter) {
      sheet.getRange(i+1, 2).setValue(value);
      found = true;
      break;
    }
  }
  if (!found) sheet.appendRow([parameter, value]);
}

function upsertRow(sheet, headers, obj, keyIndex) {
  const values = sheet.getDataRange().getValues();
  const keyValue = String(obj[headers[keyIndex]]).toLowerCase().trim();
  let rIdx = -1;
  for (let i = 1; i < values.length; i++) { if (String(values[i][keyIndex]).toLowerCase().trim() === keyValue) { rIdx = i + 1; break; } }
  const row = headers.map(h => {
    if (["q_easy", "q_medium", "q_hard", "q_code_easy", "q_code_medium", "q_code_hard", "time_oral", "time_code", "weight_oral", "weight_code", "ai_detail_level"].includes(h)) return Number(obj[h]) || 0;
    return obj[h] || "";
  });
  if (rIdx > 0) sheet.getRange(rIdx, 1, 1, row.length).setValues([row]);
  else sheet.appendRow(row);
}
