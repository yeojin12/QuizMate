const lectureFile = document.getElementById("lectureFile");
const lectureContent = document.getElementById("lectureContent");
const studyMode = document.getElementById("studyMode");
const summaryLevel = document.getElementById("summaryLevel");
const difficulty = document.getElementById("difficulty");
const questionCount = document.getElementById("questionCount");
const generateBtn = document.getElementById("generateBtn");
const resultPrompt = document.getElementById("resultPrompt");
const copyBtn = document.getElementById("copyBtn");

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
- 퀴즈 도중 또는 끝나기 전에 내가 "정리"라고 말하면, 지금까지 푼 문제와 오답을 반영한 복습용 PDF 정리본을 다시 만들어줘.

1단계. 강의자료 기반 PDF 학습 정리본 생성:
먼저 아래 강의 내용을 바탕으로 PDF 파일을 생성해줘.

PDF 파일 제목:
QuizMate_강의자료_학습정리본

PDF 정리본 구성:
1. 표지
   - 제목: QuizMate 강의자료 학습 정리본
   - 정리 수준: ${selectedSummaryLevel}
   - 목적: 퀴즈 전 1차 개념 학습

2. 전체 주제 한 줄 요약
   - 강의 전체 내용을 한 문장으로 요약

3. 핵심 개념 정리
   - 중요한 개념을 항목별로 정리
   - 개념명, 의미, 예시를 포함

4. 헷갈리기 쉬운 개념 비교표
   - 비슷하지만 다른 개념들을 표로 비교
   - 차이점이 분명하게 보이도록 정리

5. 시험에 나올 만한 포인트
   - 암기해야 할 부분
   - 이해해야 할 부분
   - 오답으로 나오기 쉬운 부분

6. 꼭 기억해야 할 키워드
   - 핵심 키워드와 간단한 설명

7. 학습자가 오해하기 쉬운 부분
   - 자주 헷갈릴 만한 내용을 정리
   - 잘못 이해했을 때 생길 수 있는 오류 설명

8. 퀴즈 전 체크리스트
   - 퀴즈를 풀기 전에 확인해야 할 질문 목록

PDF 생성 조건:
- 가능하다면 다운로드 가능한 PDF 파일로 직접 생성해줘.
- PDF 파일은 제목과 소제목이 잘 구분되도록 구성해줘.
- 표와 목록을 활용해서 공부하기 쉽게 만들어줘.
- 너무 긴 문단보다 짧은 문장과 항목 중심으로 정리해줘.
- 만약 현재 환경에서 PDF 파일 생성이 불가능하다면, PDF로 변환하기 좋은 문서 형식으로 정리해줘. 단, 이 경우에도 "PDF 저장 안내"만 하지 말고 실제 정리본 본문을 완성된 형태로 제공해줘.

PDF 정리본을 만든 뒤에는 바로 문제를 내지 말고, 다음 문장을 출력하고 기다려줘.
"PDF 정리본을 확인했다면 '시작'이라고 입력하세요. 그러면 퀴즈를 시작하겠습니다."

2단계. 대화형 퀴즈 진행:
내가 "시작"이라고 입력하면 그때부터 퀴즈를 시작해줘.

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
12. 내가 어떤 문제를 맞혔고 틀렸는지 계속 기억해줘.

3단계. 명령어 처리:
퀴즈 진행 중 내가 아래 명령어를 입력하면 그에 맞게 반응해줘.

- "힌트": 정답을 직접 말하지 말고 힌트만 제공해줘.
- "정리": 지금까지의 학습 내용을 복습용 PDF 파일로 생성해줘.
- "그만": 퀴즈를 중단하고 현재까지의 결과를 요약해줘.
- "다시": 방금 문제와 비슷한 유형의 문제를 하나 더 출제해줘.

4단계. 내가 "정리"라고 말했을 때 생성할 PDF:
내가 "정리"라고 입력하면 지금까지의 퀴즈 기록을 바탕으로 복습용 PDF 파일을 생성해줘.

PDF 파일 제목:
QuizMate_오답노트_복습정리본

PDF 구성:
1. 표지
   - 제목: QuizMate 오답노트 복습 정리본
   - 목적: 퀴즈 결과 기반 복습

2. 학습한 강의 핵심 요약
   - 전체 핵심 내용을 짧고 명확하게 정리

3. 지금까지 풀었던 문제 목록
   각 문제마다 다음 형식으로 정리:
   - 문제 번호:
   - 문제 유형:
   - 문제 내용:
   - 내가 입력한 답:
   - 정답:
   - 채점 결과:
   - 핵심 해설:

4. 틀린 문제만 따로 복습
   내가 틀린 문제가 있다면 따로 모아서 정리:
   - 틀린 문제:
   - 내가 헷갈린 부분:
   - 정확한 개념:
   - 다시 풀어볼 유사 문제 1개:

5. 중요한 개념 정리
   - 시험 대비에 중요한 개념을 목록으로 정리

6. 헷갈리기 쉬운 개념 비교표
   - 비슷하지만 다른 개념들을 표로 비교

7. 다음 복습 추천
   - 내가 더 복습해야 할 부분
   - 추천 학습 순서
   - 다음에 풀면 좋은 문제 유형

PDF 생성 조건:
- 가능하다면 다운로드 가능한 PDF 파일로 직접 생성해줘.
- PDF 파일은 제목, 소제목, 표, 목록이 잘 보이도록 구성해줘.
- 내가 틀린 문제는 반드시 따로 분리해서 오답노트처럼 정리해줘.
- 만약 현재 환경에서 PDF 파일 생성이 불가능하다면, PDF로 변환하기 좋은 문서 형식으로 정리해줘. 단, 이 경우에도 "PDF 저장 안내"만 하지 말고 실제 복습 정리본 본문을 완성된 형태로 제공해줘.

주의 사항:
- 문제를 출제할 때 정답을 미리 보여주지 마.
- 내가 답을 말하기 전까지 해설도 보여주지 마.
- 퀴즈 중에는 지금까지의 정답/오답 기록을 누적해서 기억해줘.
- "정리" 명령이 나오면 누적된 기록을 기준으로 복습용 PDF를 만들어줘.
- 처음 PDF 정리본은 퀴즈 전 학습용이고, "정리" 명령 후 PDF는 퀴즈 결과 기반 복습용이야. 두 PDF의 목적을 구분해줘.

강의 내용:
${content}`;
}

function createQuizOnlyPrompt(content, selectedDifficulty, count, selectedTypes) {
  return `아래 강의 내용을 바탕으로 나와 대화형 복습 퀴즈를 진행해줘.

전체 목표:
- 나는 강의 내용을 바탕으로 퀴즈를 풀면서 이해도를 점검하고 싶어.
- 정답과 해설을 먼저 보여주지 말고, 내가 답을 입력한 뒤 채점과 해설을 제공해줘.
- 내가 "정리"라고 말하면 지금까지 푼 문제, 오답, 중요한 개념을 복습용 PDF 파일로 생성해줘.

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
12. 내가 어떤 문제를 맞혔고 틀렸는지 계속 기억해줘.

진행 방식:
- 먼저 1번 문제만 출제해줘.
- 내가 답을 입력하면 채점해줘.
- 채점 후 다음 문제를 출제해줘.
- 내가 "힌트"라고 입력하면 정답을 직접 말하지 말고 힌트만 제공해줘.
- 내가 "정리"라고 입력하면 지금까지의 학습 내용을 복습용 PDF 파일로 생성해줘.
- 내가 "그만"이라고 입력하면 중단하고 현재까지의 결과를 요약해줘.
- 내가 "다시"라고 입력하면 방금 문제와 비슷한 유형의 문제를 하나 더 출제해줘.

내가 "정리"라고 말했을 때 생성할 PDF:
PDF 파일 제목:
QuizMate_오답노트_복습정리본

PDF 구성:
1. 표지
   - 제목: QuizMate 오답노트 복습 정리본
   - 목적: 퀴즈 결과 기반 복습

2. 학습한 강의 핵심 요약
   - 전체 핵심 내용을 짧고 명확하게 정리

3. 지금까지 풀었던 문제 목록
   각 문제마다 다음 형식으로 정리:
   - 문제 번호:
   - 문제 유형:
   - 문제 내용:
   - 내가 입력한 답:
   - 정답:
   - 채점 결과:
   - 핵심 해설:

4. 틀린 문제만 따로 복습
   내가 틀린 문제가 있다면 따로 모아서 정리:
   - 틀린 문제:
   - 내가 헷갈린 부분:
   - 정확한 개념:
   - 다시 풀어볼 유사 문제 1개:

5. 중요한 개념 정리
   - 시험 대비에 중요한 개념을 목록으로 정리

6. 헷갈리기 쉬운 개념 비교표
   - 비슷하지만 다른 개념들을 표로 비교

7. 다음 복습 추천
   - 내가 더 복습해야 할 부분
   - 추천 학습 순서
   - 다음에 풀면 좋은 문제 유형

PDF 생성 조건:
- 가능하다면 다운로드 가능한 PDF 파일로 직접 생성해줘.
- PDF 파일은 제목, 소제목, 표, 목록이 잘 보이도록 구성해줘.
- 내가 틀린 문제는 반드시 따로 분리해서 오답노트처럼 정리해줘.
- 만약 현재 환경에서 PDF 파일 생성이 불가능하다면, PDF로 변환하기 좋은 문서 형식으로 정리해줘. 단, 이 경우에도 "PDF 저장 안내"만 하지 말고 실제 복습 정리본 본문을 완성된 형태로 제공해줘.

주의 사항:
- 문제를 출제할 때 정답을 미리 보여주지 마.
- 내가 답을 말하기 전까지 해설도 보여주지 마.
- 퀴즈 중에는 지금까지의 정답/오답 기록을 누적해서 기억해줘.
- "정리" 명령이 나오면 누적된 기록을 기준으로 복습용 PDF를 만들어줘.

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