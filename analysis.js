const resultPdfFile = document.getElementById("resultPdfFile");
const manualDataInput = document.getElementById("manualDataInput");
const manualAnalyzeBtn = document.getElementById("manualAnalyzeBtn");
const totalQuestions = document.getElementById("totalQuestions");
const correctQuestions = document.getElementById("correctQuestions");
const wrongQuestions = document.getElementById("wrongQuestions");
const wrongRate = document.getElementById("wrongRate");
const recommendationBox = document.getElementById("recommendationBox");
const recordsTable = document.getElementById("recordsTable").querySelector("tbody");
const downloadCsvBtn = document.getElementById("downloadCsvBtn");
const clearDataBtn = document.getElementById("clearDataBtn");

let difficultyChart = null;
let typeChart = null;
let currentRecords = [];

if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

async function readTextFile(file) {
  return await file.text();
}

async function readPdfFile(file) {
  const arrayBuffer = await file.arrayBuffer();

  const pdf = await pdfjsLib.getDocument({
    data: arrayBuffer,
  }).promise;

  let fullText = "";

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();

    const pageText = textContent.items
      .map((item) => item.str)
      .join(" ");

    fullText += `\n\n[${pageNumber}페이지]\n${pageText}`;
  }

  return fullText.trim();
}

function extractCsvBlock(text) {
  const startMarker = "QUIZMATE_CSV_START";
  const endMarker = "QUIZMATE_CSV_END";

  const startIndex = text.indexOf(startMarker);
  const endIndex = text.indexOf(endMarker);

  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    return text
      .slice(startIndex + startMarker.length, endIndex)
      .trim();
  }

  return text.trim();
}

function parseCsvData(text) {
  const csvBlock = extractCsvBlock(text);

  const lines = csvBlock
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !line.includes("QUIZMATE_CSV_START"))
    .filter((line) => !line.includes("QUIZMATE_CSV_END"));

  if (lines.length < 2) {
    throw new Error("CSV 데이터가 부족합니다.");
  }

  const hasHeader =
    lines[0].includes("번호") &&
    lines[0].includes("난이도") &&
    lines[0].includes("유형");

  const dataLines = hasHeader ? lines.slice(1) : lines;

  const records = dataLines.map((line, index) => {
    const parts = line.split(",").map((part) => part.trim());

    if (parts.length < 5) {
      throw new Error(`${index + 1}번째 줄의 CSV 형식이 올바르지 않습니다.`);
    }

    let session = "미지정";
    let questionNumber;
    let difficulty;
    let type;
    let result;
    let weakConcept;

    if (parts.length >= 6) {
      const [sessionValue, questionNumberValue, difficultyValue, typeValue, resultValue, ...conceptParts] = parts;

      session = sessionValue || "미지정";
      questionNumber = questionNumberValue;
      difficulty = difficultyValue;
      type = typeValue;
      result = resultValue;
      weakConcept = conceptParts.join(" ").trim();
    } else {
      const [questionNumberValue, difficultyValue, typeValue, resultValue, ...conceptParts] = parts;

      questionNumber = questionNumberValue;
      difficulty = difficultyValue;
      type = typeValue;
      result = resultValue;
      weakConcept = conceptParts.join(" ").trim();
    }

    return {
      id: createRecordId(session, questionNumber, difficulty, type, result, weakConcept),
      session,
      questionNumber: Number(questionNumber) || index + 1,
      difficulty: difficulty || "미분류",
      type: type || "미분류",
      result: result || "미기록",
      isCorrect: result === "정답" || result.toLowerCase() === "correct",
      weakConcept: weakConcept || "미기록",
      addedAt: new Date().toISOString(),
    };
  });

  return records;
}

function createRecordId(session, questionNumber, difficulty, type, result, weakConcept) {
  return [
    session || "미지정",
    questionNumber || "",
    difficulty || "",
    type || "",
    result || "",
    weakConcept || "",
  ].join("|");
}

function mergeRecords(existingRecords, newRecords) {
  const recordMap = new Map();

  existingRecords.forEach((record) => {
    const id =
      record.id ||
      createRecordId(
        record.session,
        record.questionNumber,
        record.difficulty,
        record.type,
        record.result,
        record.weakConcept
      );

    recordMap.set(id, {
      ...record,
      id,
    });
  });

  newRecords.forEach((record) => {
    const id =
      record.id ||
      createRecordId(
        record.session,
        record.questionNumber,
        record.difficulty,
        record.type,
        record.result,
        record.weakConcept
      );

    if (!recordMap.has(id)) {
      recordMap.set(id, {
        ...record,
        id,
      });
    }
  });

  return Array.from(recordMap.values());
}

function analyzeRecords(newRecords) {
  const savedRecords = loadRecordsFromStorage();

  currentRecords = mergeRecords(savedRecords, newRecords);

  saveRecordsToStorage(currentRecords);

  updateSummary(currentRecords);
  updateTable(currentRecords);
  updateCharts(currentRecords);
  updateRecommendation(currentRecords);
}

function saveRecordsToStorage(records) {
  localStorage.setItem("quizMateAnalysisRecords", JSON.stringify(records));
}

function loadRecordsFromStorage() {
  const saved = localStorage.getItem("quizMateAnalysisRecords");

  if (!saved) {
    return [];
  }

  try {
    return JSON.parse(saved);
  } catch (error) {
    console.error(error);
    localStorage.removeItem("quizMateAnalysisRecords");
    return [];
  }
}

function updateSummary(records) {
  const total = records.length;
  const correct = records.filter((record) => record.isCorrect).length;
  const wrong = total - correct;
  const rate = total === 0 ? 0 : (wrong / total) * 100;

  totalQuestions.textContent = total;
  correctQuestions.textContent = correct;
  wrongQuestions.textContent = wrong;
  wrongRate.textContent = `${rate.toFixed(1)}%`;
}

function groupWrongRate(records, key) {
  const groups = {};

  records.forEach((record) => {
    const groupName = record[key] || "미분류";

    if (!groups[groupName]) {
      groups[groupName] = {
        total: 0,
        wrong: 0,
      };
    }

    groups[groupName].total += 1;

    if (!record.isCorrect) {
      groups[groupName].wrong += 1;
    }
  });

  return Object.entries(groups).map(([name, value]) => {
    const rate = value.total === 0 ? 0 : (value.wrong / value.total) * 100;

    return {
      name,
      total: value.total,
      wrong: value.wrong,
      rate,
    };
  });
}

function createBarChart(canvasId, chartInstance, labels, values, labelText) {
  const ctx = document.getElementById(canvasId);

  if (chartInstance) {
    chartInstance.destroy();
  }

  return new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: labelText,
          data: values,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: function (value) {
              return `${value}%`;
            },
          },
        },
      },
    },
  });
}

function updateCharts(records) {
  const difficultyData = groupWrongRate(records, "difficulty");
  const typeData = groupWrongRate(records, "type");

  difficultyChart = createBarChart(
    "difficultyChart",
    difficultyChart,
    difficultyData.map((item) => item.name),
    difficultyData.map((item) => Number(item.rate.toFixed(1))),
    "오답률"
  );

  typeChart = createBarChart(
    "typeChart",
    typeChart,
    typeData.map((item) => item.name),
    typeData.map((item) => Number(item.rate.toFixed(1))),
    "오답률"
  );
}

function updateTable(records) {
  if (records.length === 0) {
    recordsTable.innerHTML = `
      <tr>
        <td colspan="5">아직 분석된 데이터가 없습니다.</td>
      </tr>
    `;
    return;
  }

  recordsTable.innerHTML = records
    .map((record) => {
      return `
        <tr>
          <td>${record.questionNumber}</td>
          <td>${record.difficulty}</td>
          <td>${record.type}</td>
          <td>${record.isCorrect ? "정답" : "오답"}</td>
          <td>${record.weakConcept}</td>
        </tr>
      `;
    })
    .join("");
}

function getHighestRateGroup(groupedData) {
  if (groupedData.length === 0) {
    return null;
  }

  return groupedData.reduce((highest, current) => {
    return current.rate > highest.rate ? current : highest;
  });
}

function updateRecommendation(records) {
  if (records.length === 0) {
    recommendationBox.textContent = "아직 분석된 결과가 없습니다.";
    return;
  }

  const total = records.length;
  const wrong = records.filter((record) => !record.isCorrect).length;
  const overallWrongRate = total === 0 ? 0 : (wrong / total) * 100;

  const difficultyData = groupWrongRate(records, "difficulty");
  const typeData = groupWrongRate(records, "type");

  const weakestDifficulty = getHighestRateGroup(difficultyData);
  const weakestType = getHighestRateGroup(typeData);

  const weakConcepts = records
    .filter((record) => !record.isCorrect)
    .map((record) => record.weakConcept)
    .filter((concept) => concept && concept !== "미기록");

  const conceptCount = {};

  weakConcepts.forEach((concept) => {
    conceptCount[concept] = (conceptCount[concept] || 0) + 1;
  });

  const frequentWeakConcepts = Object.entries(conceptCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([concept]) => concept);

  let recommendation = "";

  if (overallWrongRate >= 70) {
    recommendation +=
      "누적 오답률이 매우 높습니다. 지금은 어려운 문제를 늘리기보다 쉬움 난이도의 O/X와 객관식 문제로 기본 개념을 다시 확인하는 것이 우선입니다.<br><br>";
  } else if (overallWrongRate >= 40) {
    recommendation +=
      "누적 오답률이 중간 이상입니다. 개념을 어느 정도 알고 있지만 헷갈리는 지점이 남아 있습니다. 보통 난이도의 객관식과 O/X 문제를 반복하는 것이 좋습니다.<br><br>";
  } else {
    recommendation +=
      "누적 오답률이 낮은 편입니다. 현재 수준에서는 보통 또는 어려움 난이도의 단답형·서술형 문제로 넘어가도 좋습니다.<br><br>";
  }

  if (weakestDifficulty) {
    recommendation += `가장 취약한 난이도는 <strong>${weakestDifficulty.name}</strong>입니다. 해당 난이도에서 오답률이 <strong>${weakestDifficulty.rate.toFixed(
      1
    )}%</strong>로 나타났습니다.<br>`;
  }

  if (weakestType) {
    recommendation += `가장 취약한 문제 유형은 <strong>${weakestType.name}</strong>입니다. 이 유형의 오답률은 <strong>${weakestType.rate.toFixed(
      1
    )}%</strong>입니다.<br><br>`;
  }

  if (frequentWeakConcepts.length > 0) {
    recommendation += `우선 복습할 개념은 <strong>${frequentWeakConcepts.join(
      ", "
    )}</strong>입니다.<br><br>`;
  }

  recommendation +=
    "추천 학습 순서: PDF 정리본 다시 읽기 → 쉬운 O/X 문제 → 보통 객관식 문제 → 틀린 개념 중심 단답형 문제 순서로 진행하세요.";

  recommendationBox.innerHTML = recommendation;
}

async function handleResultFileUpload(event) {
  const file = event.target.files[0];

  if (!file) {
    return;
  }

  const fileName = file.name.toLowerCase();

  try {
    recommendationBox.textContent = "파일을 읽고 누적 분석하는 중입니다...";

    let extractedText = "";

    if (fileName.endsWith(".pdf")) {
      extractedText = await readPdfFile(file);
    } else if (
      fileName.endsWith(".txt") ||
      fileName.endsWith(".md") ||
      fileName.endsWith(".csv")
    ) {
      extractedText = await readTextFile(file);
    } else {
      alert("pdf, txt, md, csv 파일만 업로드할 수 있습니다.");
      recommendationBox.textContent = "지원하지 않는 파일 형식입니다.";
      return;
    }

    const newRecords = parseCsvData(extractedText);
    analyzeRecords(newRecords);
  } catch (error) {
    console.error(error);
    alert("분석에 실패했습니다. CSV 형식을 확인해주세요.");
    recommendationBox.textContent =
      "분석에 실패했습니다. 수동 입력 영역에 CSV 데이터를 붙여넣어 주세요.";
  }
}

function handleManualAnalyze() {
  const text = manualDataInput.value.trim();

  if (!text) {
    alert("분석용 CSV 데이터를 입력해주세요.");
    return;
  }

  try {
    const newRecords = parseCsvData(text);
    analyzeRecords(newRecords);
  } catch (error) {
    console.error(error);
    alert("CSV 데이터 형식이 올바르지 않습니다.");
  }
}

function convertRecordsToCsv(records) {
  const headers = ["세션", "번호", "난이도", "유형", "결과", "취약개념"];

  const rows = records.map((record) => {
    return [
      record.session || "미지정",
      record.questionNumber,
      record.difficulty,
      record.type,
      record.isCorrect ? "정답" : "오답",
      record.weakConcept,
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

function downloadCsv() {
  if (currentRecords.length === 0) {
    alert("다운로드할 분석 데이터가 없습니다.");
    return;
  }

  const csv = convertRecordsToCsv(currentRecords);
  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "quizmate_analysis_records.csv";
  link.click();

  URL.revokeObjectURL(url);
}

function clearData() {
  const confirmed = confirm("분석 데이터를 초기화할까요?");

  if (!confirmed) {
    return;
  }

  currentRecords = [];
  localStorage.removeItem("quizMateAnalysisRecords");

  updateSummary(currentRecords);
  updateTable(currentRecords);
  updateCharts(currentRecords);
  updateRecommendation(currentRecords);
}

function loadSavedRecords() {
  currentRecords = loadRecordsFromStorage();

  updateSummary(currentRecords);
  updateTable(currentRecords);
  updateCharts(currentRecords);
  updateRecommendation(currentRecords);
}

resultPdfFile.addEventListener("change", handleResultFileUpload);
manualAnalyzeBtn.addEventListener("click", handleManualAnalyze);
downloadCsvBtn.addEventListener("click", downloadCsv);
clearDataBtn.addEventListener("click", clearData);

loadSavedRecords();