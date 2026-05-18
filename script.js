const lectureFile = document.getElementById("lectureFile");
const lectureContent = document.getElementById("lectureContent");
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

function generatePrompt() {
  const content = lectureContent.value.trim();
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

  const prompt = `아래 강의 내용을 바탕으로 나와 대화형 복습 퀴즈를 진행해줘.

조건:
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
12. 마지막 문제까지 끝나면 전체 점수와 내가 부족한 개념을 요약해줘.

진행 방식:
- 먼저 1번 문제만 출제해줘.
- 내가 답을 입력하면 채점해줘.
- 채점 후 다음 문제를 출제해줘.
- 내가 "그만"이라고 입력하면 중단하고 현재까지의 결과를 요약해줘.
- 내가 "힌트"라고 입력하면 정답을 직접 말하지 말고 힌트만 제공해줘.

강의 내용:
${content}`;

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