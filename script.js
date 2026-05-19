const lectureFile = document.getElementById("lectureFile");
const lectureContent = document.getElementById("lectureContent");
const studyMode = document.getElementById("studyMode");
const summaryLevel = document.getElementById("summaryLevel");
const difficulty = document.getElementById("difficulty");
const questionCount = document.getElementById("questionCount");
const generateBtn = document.getElementById("generateBtn");
const resultPrompt = document.getElementById("resultPrompt");
const copyBtn = document.getElementById("copyBtn");

if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

function getSelectedQuestionTypes() {
  const checkedTypes = document.querySelectorAll(
    'input[name="questionType"]:checked'
  );

  return Array.from(checkedTypes).map((type) => type.value);
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

async function handleFileUpload(event) {
  const file = event.target.files[0];

  if (!file) {
    return;
  }

  const fileName = file.name.toLowerCase();

  try {
    lectureContent.value = "파일을 읽는 중입니다...";

    let extractedText = "";

    if (fileName.endsWith(".txt") || fileName.endsWith(".md")) {
      extractedText = await readTextFile(file);
    } else if (fileName.endsWith(".pdf")) {
      extractedText = await readPdfFile(file);
    } else {
      alert("txt, md, pdf 파일만 업로드할 수 있습니다.");
      lectureContent.value = "";
      return;
    }

    if (!extractedText.trim()) {
      lectureContent.value = "";
      alert(
        "파일에서 텍스트를 읽지 못했습니다. 스캔본 PDF이거나 이미지로 된 자료일 수 있습니다."
      );
      return;
    }

    lectureContent.value = extractedText;
  } catch (error) {
    console.error(error);
    lectureContent.value = "";
    alert("파일을 읽는 중 오류가 발생했습니다.");
  }
}

function getCsvDataInstruction(selectedDifficulty, selectedTypes) {
  return `

중요: QuizMate 결과 분석용 CSV 데이터 생성 규칙

내가 "정리"라고 입력하면, 복습용 PDF를 만들 때 PDF 마지막에 반드시 아래 형식의 CSV 데이터를 넣어줘.
가능하다면 같은 내용을 별도의 txt 파일로도 만들어줘. 파일 이름은 QuizMate_analysis_data.txt 로 해줘.

반드시 아래 형식을 그대로 사용해줘.

QUIZMATE_CSV_START
세션,번호,난이도,유형,결과,취약개념
AI기초_1회차,1,쉬움,O/X,오답,인공지능 정의
AI기초_1회차,2,쉬움,객관식,정답,기계학습 분류
AI기초_1회차,3,쉬움,단답형,오답,규칙기반과 데이터기반
QUIZMATE_CSV_END

CSV 작성 규칙:
- JSON을 만들지 마. 중괄호 { } 를 사용하지 마.
- 따옴표를 사용하지 마.
- 문제 전문을 넣지 마.
- 해설 전문을 넣지 마.
- 각 줄은 반드시 세션,번호,난이도,유형,결과,취약개념 순서로 작성해줘.
- 쉼표는 각 줄에 정확히 5개만 사용해줘.
- 취약개념 안에는 쉼표를 넣지 마.
- 세션 이름은 강의 주제와 회차를 짧게 조합해서 만들어줘. 예: AI기초_1회차, 컴퓨터구조_2회차
- 난이도는 쉬움, 보통, 어려움 중 하나로 써줘.
- 기본 난이도는 "${selectedDifficulty}"이야.
- 유형은 ${selectedTypes.join(", ")} 중 실제 유형으로 써줘.
- 결과는 정답 또는 오답 중 하나로 써줘.
- 맞힌 문제와 틀린 문제를 모두 기록해줘.
- PDF 안에서 CSV 구간은 이미지가 아니라 선택 가능한 텍스트로 넣어줘.
- QUIZMATE_CSV_START와 QUIZMATE_CSV_END 마커를 번역하거나 바꾸지 마.

가장 중요한 세션 범위 규칙:
- 내가 "정리"라고 입력하면, 반드시 가장 최근에 내가 "시작"이라고 입력한 이후에 푼 문제만 정리해줘.
- 이전에 이미 정리했던 문제나 이전 세션의 문제는 다시 포함하지 마.
- 이전 대화에 다른 정리본이나 오답노트가 있어도 참고하지 마.
- 현재 세션에서 실제로 출제하고 내가 답한 문제만 CSV에 넣어줘.
- 만약 현재 세션에서 푼 문제 기록이 불명확하면, 임의로 이전 내용을 섞지 말고 나에게 "이번 세션에서 푼 문제 기록을 다시 확인해달라"고 물어봐.
`;
}

function createSummaryFirstPrompt(
  content,
  selectedDifficulty,
  count,
  selectedTypes,
  selectedSummaryLevel
) {
  return `아래 강의 내용을 바탕으로 먼저 학습 정리본 PDF 파일을 생성하고, 이후 나와 대화형 복습 퀴즈를 진행해줘.

전체 목표:
- 나는 강의자료를 먼저 정리본으로 공부한 뒤, 퀴즈를 풀면서 내가 제대로 이해했는지 점검하고 싶어.
- 처음에는 강의 내용을 "${selectedSummaryLevel}" 수준으로 정리한 PDF 학습 정리본을 만들어줘.
- 그다음 내가 "시작"이라고 입력하면 퀴즈를 시작해줘.
- 퀴즈에서는 정답을 바로 보여주지 말고, 내가 직접 답을 말하면 그때 채점과 해설을 제공해줘.
- 퀴즈 도중 또는 끝나기 전에 내가 "정리"라고 말하면, 가장 최근 "시작" 이후 푼 문제와 오답만 반영한 복습용 PDF 정리본을 다시 만들어줘.
- 최종 결과 PDF에는 QuizMate에서 분석할 수 있는 CSV 데이터를 반드시 포함해줘.

세션 관리 규칙:
- 내가 "시작"이라고 입력하는 순간부터 하나의 새 퀴즈 세션으로 간주해줘.
- 해당 세션에서 출제한 문제, 내가 입력한 답, 정답 여부, 취약 개념을 내부적으로 계속 기록해줘.
- 내가 "정리"라고 입력하면 현재 세션의 기록만 정리해줘.
- 이전 세션에서 이미 정리한 문제나 예전 오답노트 내용을 다시 포함하지 마.
- 내가 "새로시작"이라고 입력하면 기존 퀴즈 기록을 모두 무시하고 새로운 세션으로 시작해줘.

1단계. 강의자료 기반 PDF 학습 정리본 생성:
먼저 아래 강의 내용을 바탕으로 PDF 파일을 생성해줘.

PDF 파일 제목:
QuizMate_강의자료_학습정리본

PDF 정리본 구성:
1. 표지
2. 전체 주제 한 줄 요약
3. 핵심 개념 정리
4. 헷갈리기 쉬운 개념 비교표
5. 시험에 나올 만한 포인트
6. 꼭 기억해야 할 키워드
7. 학습자가 오해하기 쉬운 부분
8. 퀴즈 전 체크리스트

PDF 생성 조건:
- 가능하다면 다운로드 가능한 PDF 파일로 직접 생성해줘.
- 제목과 소제목이 잘 구분되도록 구성해줘.
- 표와 목록을 활용해서 공부하기 쉽게 만들어줘.
- 너무 긴 문단보다 짧은 문장과 항목 중심으로 정리해줘.

PDF 정리본을 만든 뒤에는 바로 문제를 내지 말고, 다음 문장을 출력하고 기다려줘.
"PDF 정리본을 확인했다면 '시작'이라고 입력하세요. 그러면 새로운 퀴즈 세션을 시작하겠습니다."

2단계. 대화형 퀴즈 진행:
내가 "시작"이라고 입력하면 그때부터 새로운 퀴즈 세션을 시작해줘.

퀴즈 조건:
1. 대상은 대학 교양 과목 수강생 수준으로 설정해줘.
2. 난이도는 "${selectedDifficulty}" 수준으로 만들어줘.
3. 총 ${count}문제를 출제해줘.
4. 문제 유형은 ${selectedTypes.join(", ")}을 포함해줘.
5. 모든 문제를 한 번에 보여주지 말고, 한 문제씩 출제해줘.
6. 정답과 해설은 내가 답을 말하기 전까지 절대 보여주지 마.
7. 내가 답을 입력하면 정답 여부를 판단해줘.
8. 정답이면 핵심 해설을 간단히 제공하고 다음 문제로 넘어가줘.
9. 오답이면 왜 틀렸는지 설명하고, 관련 개념을 다시 정리해줘.
10. 단순 암기 문제만 만들지 말고, 개념 이해를 확인하는 문제도 포함해줘.
11. 헷갈리기 쉬운 개념은 오답 선지로 활용해줘.
12. 내가 어떤 문제를 맞혔고 틀렸는지 현재 세션 기준으로 계속 기록해줘.

3단계. 명령어 처리:
- "힌트": 정답을 직접 말하지 말고 힌트만 제공해줘.
- "정리": 가장 최근 "시작" 이후 푼 현재 세션의 학습 내용을 복습용 PDF 파일로 생성해줘.
- "그만": 현재 세션을 중단하고 현재까지의 결과를 요약해줘.
- "다시": 방금 문제와 비슷한 유형의 문제를 하나 더 출제해줘.
- "새로시작": 이전 문제 기록을 무시하고 새로운 퀴즈 세션을 시작해줘.

4단계. 내가 "정리"라고 말했을 때 생성할 PDF:
PDF 파일 제목:
QuizMate_오답노트_복습정리본

PDF 구성:
1. 표지
2. 현재 세션에서 학습한 강의 핵심 요약
3. 현재 세션에서 풀었던 문제 목록
4. 현재 세션에서 틀린 문제만 따로 복습
5. 중요한 개념 정리
6. 헷갈리기 쉬운 개념 비교표
7. 다음 복습 추천
8. QuizMate 분석용 CSV 데이터

PDF 생성 조건:
- 가능하다면 다운로드 가능한 PDF 파일로 직접 생성해줘.
- 현재 세션에서 내가 틀린 문제는 반드시 따로 분리해서 오답노트처럼 정리해줘.
- 이전 세션의 문제는 포함하지 마.
- PDF 마지막에는 QuizMate 분석용 CSV 데이터를 반드시 포함해줘.

${getCsvDataInstruction(selectedDifficulty, selectedTypes)}

주의 사항:
- 문제를 출제할 때 정답을 미리 보여주지 마.
- 내가 답을 말하기 전까지 해설도 보여주지 마.
- 퀴즈 중에는 현재 세션의 정답/오답 기록을 누적해서 기억해줘.
- "정리" 명령이 나오면 현재 세션의 누적 기록만 기준으로 복습용 PDF를 만들어줘.

강의 내용:
${content}`;
}

function createQuizOnlyPrompt(content, selectedDifficulty, count, selectedTypes) {
  return `아래 강의 내용을 바탕으로 나와 대화형 복습 퀴즈를 진행해줘.

전체 목표:
- 나는 강의 내용을 바탕으로 퀴즈를 풀면서 이해도를 점검하고 싶어.
- 정답과 해설을 먼저 보여주지 말고, 내가 답을 입력한 뒤 채점과 해설을 제공해줘.
- 내가 "정리"라고 말하면 가장 최근 "시작" 이후 푼 현재 세션의 문제, 오답, 중요한 개념을 복습용 PDF 파일로 생성해줘.
- 최종 결과 PDF에는 QuizMate에서 분석할 수 있는 CSV 데이터를 반드시 포함해줘.

세션 관리 규칙:
- 이 프롬프트를 받은 뒤 바로 새로운 퀴즈 세션을 시작한다고 간주해줘.
- 내가 답한 문제만 현재 세션 기록에 포함해줘.
- 이전 대화에서 이미 정리했던 문제나 예전 오답노트 내용을 다시 포함하지 마.
- 내가 "정리"라고 입력하면 현재 세션의 기록만 정리해줘.
- 내가 "새로시작"이라고 입력하면 기존 퀴즈 기록을 모두 무시하고 새로운 세션으로 시작해줘.

퀴즈 조건:
1. 대상은 대학 교양 과목 수강생 수준으로 설정해줘.
2. 난이도는 "${selectedDifficulty}" 수준으로 만들어줘.
3. 총 ${count}문제를 출제해줘.
4. 문제 유형은 ${selectedTypes.join(", ")}을 포함해줘.
5. 모든 문제를 한 번에 보여주지 말고, 한 문제씩 출제해줘.
6. 정답과 해설은 내가 답을 말하기 전까지 절대 보여주지 마.
7. 내가 답을 입력하면 정답 여부를 판단해줘.
8. 정답이면 핵심 해설을 간단히 제공하고 다음 문제로 넘어가줘.
9. 오답이면 왜 틀렸는지 설명하고, 관련 개념을 다시 정리해줘.
10. 단순 암기 문제만 만들지 말고, 개념 이해를 확인하는 문제도 포함해줘.
11. 헷갈리기 쉬운 개념은 오답 선지로 활용해줘.
12. 내가 어떤 문제를 맞혔고 틀렸는지 현재 세션 기준으로 계속 기록해줘.

진행 방식:
- 먼저 1번 문제만 출제해줘.
- 내가 답을 입력하면 채점해줘.
- 채점 후 다음 문제를 출제해줘.
- 내가 "힌트"라고 입력하면 정답을 직접 말하지 말고 힌트만 제공해줘.
- 내가 "정리"라고 입력하면 현재 세션의 학습 내용을 복습용 PDF 파일로 생성해줘.
- 내가 "그만"이라고 입력하면 현재 세션을 중단하고 현재까지의 결과를 요약해줘.
- 내가 "다시"라고 입력하면 방금 문제와 비슷한 유형의 문제를 하나 더 출제해줘.
- 내가 "새로시작"이라고 입력하면 이전 기록을 무시하고 새로운 퀴즈 세션을 시작해줘.

내가 "정리"라고 말했을 때 생성할 PDF:
PDF 파일 제목:
QuizMate_오답노트_복습정리본

PDF 구성:
1. 표지
2. 현재 세션에서 학습한 강의 핵심 요약
3. 현재 세션에서 풀었던 문제 목록
4. 현재 세션에서 틀린 문제만 따로 복습
5. 중요한 개념 정리
6. 헷갈리기 쉬운 개념 비교표
7. 다음 복습 추천
8. QuizMate 분석용 CSV 데이터

PDF 생성 조건:
- 가능하다면 다운로드 가능한 PDF 파일로 직접 생성해줘.
- 현재 세션에서 내가 틀린 문제는 반드시 따로 분리해서 오답노트처럼 정리해줘.
- 이전 세션의 문제는 포함하지 마.
- PDF 마지막에는 QuizMate 분석용 CSV 데이터를 반드시 포함해줘.

${getCsvDataInstruction(selectedDifficulty, selectedTypes)}

주의 사항:
- 문제를 출제할 때 정답을 미리 보여주지 마.
- 내가 답을 말하기 전까지 해설도 보여주지 마.
- 퀴즈 중에는 현재 세션의 정답/오답 기록을 누적해서 기억해줘.
- "정리" 명령이 나오면 현재 세션의 누적 기록만 기준으로 복습용 PDF를 만들어줘.

강의 내용:
${content}`;
}

function generatePrompt() {
  const content = lectureContent.value.trim();
  const selectedStudyMode = studyMode.value;
  const selectedSummaryLevel = summaryLevel.value;
  const selectedDifficulty = difficulty.value;
  const count = questionCount.value;
  const selectedTypes = getSelectedQuestionTypes();

  if (!content) {
    alert("강의 내용을 입력하거나 파일을 업로드해주세요.");
    return;
  }

  if (selectedTypes.length === 0) {
    alert("문제 유형을 하나 이상 선택해주세요.");
    return;
  }

  if (!count || count < 1) {
    alert("문제 수를 1개 이상으로 설정해주세요.");
    return;
  }

  let prompt = "";

  if (selectedStudyMode === "summaryFirst") {
    prompt = createSummaryFirstPrompt(
      content,
      selectedDifficulty,
      count,
      selectedTypes,
      selectedSummaryLevel
    );
  } else {
    prompt = createQuizOnlyPrompt(
      content,
      selectedDifficulty,
      count,
      selectedTypes
    );
  }

  resultPrompt.textContent = prompt;
}

async function copyPrompt() {
  const text = resultPrompt.textContent;

  if (text === "아직 생성된 프롬프트가 없습니다.") {
    alert("먼저 프롬프트를 생성해주세요.");
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    copyBtn.textContent = "복사 완료!";

    setTimeout(() => {
      copyBtn.textContent = "복사하기";
    }, 1500);
  } catch (error) {
    alert("복사에 실패했습니다. 직접 드래그해서 복사해주세요.");
  }
}

generateBtn.addEventListener("click", generatePrompt);
copyBtn.addEventListener("click", copyPrompt);
lectureFile.addEventListener("change", handleFileUpload);