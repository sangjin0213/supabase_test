/* =========================================
   바이브 카페 주문서 기능
   ========================================= */

/* -----------------------------------------
   0. Supabase 연결 설정
   - Supabase 대시보드 > Project Settings > API 에서 값을 복사해 넣으세요.
   - SUPABASE_URL: 프로젝트 주소 (예: https://abcdefgh.supabase.co)
   - SUPABASE_KEY: anon(public) 키. 웹페이지에 공개돼도 되는 키입니다.
     (service_role 키는 절대 넣으면 안 됩니다!)
   ----------------------------------------- */
const SUPABASE_URL = 'https://zmtkfxtjhywrpfcmlcee.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptdGtmeHRqaHl3cnBmY21sY2VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0MjQ1MDcsImV4cCI6MjEwNzAwMDUwN30.SqFTE92Gs0CF8fq0OxWT-DQoTQRJz0iuV7AMnWZOoVg';

// index.html에서 불러온 Supabase 라이브러리가 전역 변수 supabase를 만들어 줍니다.
// createClient로 "우리 프로젝트에 연결된 클라이언트"를 만들어 두고, 저장할 때 사용합니다.
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


/* -----------------------------------------
   1. 화면 요소 가져오기
   - document.getElementById('아이디')로 HTML 요소를 찾아서 변수에 담아 둡니다.
   - 자주 쓰는 요소를 미리 담아 두면 매번 찾지 않아도 됩니다.
   ----------------------------------------- */
const orderForm = document.getElementById('order-form');       // 주문서 전체(form)
const nameInput = document.getElementById('customer-name');    // 이름 입력칸
const phoneInput = document.getElementById('customer-phone');  // 전화번호 입력칸
const requestInput = document.getElementById('request');       // 요청사항 입력칸
const orderButton = document.getElementById('order-button');   // 주문하기 버튼
const drinkSelect = document.getElementById('drink');          // 음료 드롭다운
const quantityInput = document.getElementById('quantity');     // 수량 입력칸
const totalPriceText = document.getElementById('total-price'); // 예상 금액 숫자 부분
const orderResult = document.getElementById('order-result');   // 주문 확인 메시지 영역


/* -----------------------------------------
   2. 작은 도우미 함수들
   ----------------------------------------- */

// 수량을 숫자로 읽어오는 함수
// - input에 적힌 값은 항상 "문자열"이라서 Number()로 숫자로 바꿔야 계산할 수 있습니다.
// - 비어 있거나 이상한 값이면 1로, 범위를 벗어나면 1~10 사이로 맞춰 줍니다.
function getQuantity() {
  const quantity = Number(quantityInput.value);

  // Number.isInteger: 정수(1, 2, 3...)인지 확인. 빈칸이나 1.5 같은 값은 false
  if (!Number.isInteger(quantity) || quantity < 1) {
    return 1;
  }
  if (quantity > 10) {
    return 10;
  }
  return quantity;
}

// 지금 선택된 사이즈 라디오 버튼을 찾는 함수
// - :checked 는 "체크된 것만" 고르는 CSS 선택자입니다.
function getSelectedSize() {
  return document.querySelector('input[name="size"]:checked');
}

// 지금 체크된 추가 옵션 체크박스들을 모두 찾는 함수
// - querySelectorAll은 여러 개를 찾아 목록(NodeList)으로 돌려줍니다.
// - Array.from으로 일반 배열로 바꿔야 map, reduce 같은 배열 기능을 쓸 수 있습니다.
function getCheckedOptions() {
  return Array.from(document.querySelectorAll('input[name="options"]:checked'));
}

// 숫자를 "5,000" 처럼 천 단위 콤마가 있는 글자로 바꾸는 함수
function formatPrice(price) {
  return price.toLocaleString('ko-KR');
}


/* -----------------------------------------
   3. 금액 계산 함수 (이 함수 하나를 여러 곳에서 재사용합니다)
   - 계산식: (음료 가격 + 사이즈 추가금 + 옵션 추가금 합계) × 수량
   - 음료를 아직 고르지 않았다면 0원을 돌려줍니다.
   ----------------------------------------- */
function calculateTotal() {
  // 드롭다운에서 지금 선택된 <option> 요소
  const selectedDrink = drinkSelect.options[drinkSelect.selectedIndex];

  // 첫 항목 "-- 음료를 선택하세요 --"는 value가 빈 문자열("")입니다.
  // 즉, value가 비어 있으면 아직 음료를 안 고른 것이므로 0원.
  if (drinkSelect.value === '') {
    return 0;
  }

  // data-price="4000" 같은 값은 dataset.price로 읽을 수 있습니다. (문자열 → 숫자로 변환)
  const drinkPrice = Number(selectedDrink.dataset.price);

  // 선택된 사이즈의 추가금 (혹시 선택된 게 없으면 0원)
  const size = getSelectedSize();
  const sizePrice = size ? Number(size.dataset.price) : 0;

  // 체크된 옵션들의 추가금을 모두 더하기
  // reduce: 배열을 돌면서 값을 하나로 합쳐 주는 기능 (sum은 지금까지의 합계)
  const optionPrice = getCheckedOptions().reduce(function (sum, option) {
    return sum + Number(option.dataset.price);
  }, 0);

  // 한 잔 가격 × 수량 = 총 금액
  const onePrice = drinkPrice + sizePrice + optionPrice;
  return onePrice * getQuantity();
}


/* -----------------------------------------
   4. 예상 금액을 화면에 표시하는 함수
   - calculateTotal()로 계산한 값을 콤마를 붙여서 화면에 넣습니다.
   - HTML이 "예상 금액: <span>0</span>원" 구조라서 숫자 부분만 바꾸면 됩니다.
   ----------------------------------------- */
function updateTotalPrice() {
  totalPriceText.textContent = formatPrice(calculateTotal());
}


/* -----------------------------------------
   4-1. 화면 하단 알림창 (토스트)
   - 브라우저 기본 alert 대신, 화면 아래에 검은 알림창을 2초 동안 띄웠다가 사라지게 합니다.
   - index.html을 건드리지 않도록, 알림창 요소는 JavaScript로 직접 만들어 붙입니다.
   ----------------------------------------- */
const toast = document.createElement('div'); // 새 <div> 만들기
toast.className = 'toast';                   // style.css의 .toast 디자인 적용
toast.setAttribute('role', 'status');        // 화면 읽기 프로그램이 알림 내용을 읽어 주도록 설정
toast.setAttribute('aria-live', 'polite');
document.body.appendChild(toast);            // <body> 맨 끝에 붙이기

let toastTimer = null; // 알림창을 숨기는 타이머를 기억해 두는 변수

function showToast(message) {
  toast.textContent = message;  // 알림 문구 넣기
  toast.classList.add('show');  // show 클래스가 붙으면 CSS에서 화면에 나타남

  // 2초 안에 또 알림이 오면, 이전 타이머를 취소하고 처음부터 다시 2초를 셉니다.
  clearTimeout(toastTimer);

  // setTimeout(함수, 2000): 2000밀리초(=2초) 뒤에 함수를 실행
  toastTimer = setTimeout(function () {
    toast.classList.remove('show'); // show 클래스를 빼면 다시 사라짐
  }, 2000);
}


/* -----------------------------------------
   5. 잘못 입력한 칸으로 이동 + 좌우로 흔들기
   - scrollIntoView: 해당 칸이 화면 가운데 오도록 부드럽게 스크롤합니다.
   - shake 클래스: style.css에 있는 흔들림 애니메이션을 실행합니다.
   ----------------------------------------- */
function moveAndShake(element) {
  // 1) 해당 칸이 화면 가운데로 오도록 스크롤
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // 2) 바로 입력할 수 있도록 커서 넣기
  //    preventScroll: true → focus 때문에 화면이 "툭" 튀지 않도록 막아 줍니다.
  element.focus({ preventScroll: true });

  // 3) 흔들림 애니메이션
  //    같은 칸에서 여러 번 실수해도 매번 흔들리도록, 클래스를 뺐다가 다시 붙입니다.
  element.classList.remove('shake');
  void element.offsetWidth; // 브라우저에게 "지금 상태를 한 번 반영해"라고 알려 주는 요령 (애니메이션 재시작용)
  element.classList.add('shake');
}

// 흔들림 애니메이션이 끝나면 shake 클래스를 자동으로 지워 줍니다.
// - animationend: CSS 애니메이션이 끝났을 때 발생하는 이벤트
// - 폼 안의 어느 칸에서 끝나든 이 한 곳에서 처리합니다. (이벤트 위임)
orderForm.addEventListener('animationend', function (event) {
  event.target.classList.remove('shake');
});


/* -----------------------------------------
   6. 값이 바뀔 때마다 실시간으로 금액 다시 계산
   - input 이벤트: 수량 칸에 숫자를 타이핑할 때마다 발생
   - change 이벤트: 드롭다운, 라디오, 체크박스를 바꿨을 때 발생
   - 폼 전체에 이벤트를 한 번만 걸어 두면, 안에 있는 모든 칸의 변화를 잡을 수 있습니다.
   ----------------------------------------- */
orderForm.addEventListener('input', updateTotalPrice);
orderForm.addEventListener('change', updateTotalPrice);

// 수량 칸에서 빠져나올 때(blur), 이상한 값이면 1~10 사이의 올바른 값으로 고쳐 줍니다.
quantityInput.addEventListener('blur', function () {
  quantityInput.value = getQuantity();
  updateTotalPrice();
});


/* -----------------------------------------
   7. 주문하기 버튼 (form의 submit 이벤트)
   - async: 함수 안에서 await(서버 응답 기다리기)를 쓰기 위해 붙입니다.
   ----------------------------------------- */
orderForm.addEventListener('submit', async function (event) {
  // 기본 동작(페이지 새로고침)을 막습니다. 막지 않으면 화면이 초기화돼 버립니다.
  event.preventDefault();

  // trim(): 앞뒤 공백 제거. 스페이스만 입력한 경우도 "비어 있음"으로 처리하기 위함
  const name = nameInput.value.trim();

  // (1) 이름 검사
  // 하단 알림창을 띄우는 동시에 해당 칸으로 이동 + 흔들림
  if (name === '') {
    showToast('이름을 입력해주세요');
    moveAndShake(nameInput);
    return; // 여기서 함수 종료 → 아래 코드는 실행되지 않음
  }

  // (2) 음료 선택 검사
  if (drinkSelect.value === '') {
    showToast('음료를 선택해주세요');
    moveAndShake(drinkSelect);
    return;
  }

  // (3) 주문 내용 모으기
  const drinkName = drinkSelect.value;                 // 예: "카페라떼"
  const drinkPrice = Number(drinkSelect.options[drinkSelect.selectedIndex].dataset.price); // 예: 4000
  const sizeName = getSelectedSize().value;            // 예: "M"
  const quantity = getQuantity();                      // 예: 1
  const total = calculateTotal();                      // 예: 5000

  // 체크된 옵션 이름만 뽑아서 배열로 만들기 → 예: ["샷 추가", "시럽 추가"]
  const optionNames = getCheckedOptions().map(function (option) {
    return option.value;
  });

  // 옵션이 있으면 " (샷 추가, 시럽 추가)" 형태로, 없으면 빈 문자열
  const optionText = optionNames.length > 0 ? ' (' + optionNames.join(', ') + ')' : '';

  // (4) Supabase의 orders 테이블에 주문 저장
  // 저장하는 동안 버튼을 잠가서 두 번 눌러 주문이 두 번 들어가는 것을 막습니다.
  orderButton.disabled = true;

  // insert: 테이블에 새 줄(행)을 추가합니다. { 열 이름: 값 } 형태로 넘겨 줍니다.
  // await: 서버에서 "저장 끝났어요" 응답이 올 때까지 기다립니다.
  // 결과 중 error만 꺼내 씁니다. 저장이 잘 되면 error는 null입니다.
  const { error } = await supabaseClient.from('orders').insert({
    customer_name: name,
    phone: phoneInput.value.trim() || null,      // 비어 있으면 null(값 없음)로 저장
    drink: drinkName,
    drink_price: drinkPrice,
    size: sizeName,
    options: optionNames,                         // 배열 그대로 저장 → 예: ["샷 추가"]
    quantity: quantity,
    request: requestInput.value.trim() || null,
    total_price: total
  });

  // 응답이 왔으니 (성공이든 실패든) 버튼을 다시 풀어 줍니다.
  orderButton.disabled = false;

  // 저장에 실패했다면 알림을 띄우고, 자세한 이유는 개발자 도구(F12) 콘솔에 출력합니다.
  if (error) {
    showToast('주문 저장에 실패했어요');
    console.error('주문 저장 실패:', error);
    return; // 실패했으므로 주문 확인 메시지는 보여주지 않고 종료
  }

  // (5) 주문 확인 메시지 만들기
  // 백틱(`)으로 감싼 문자열 안에서는 ${변수} 로 값을 바로 끼워 넣을 수 있습니다.
  const message =
    `${name}님, ${drinkName} ${sizeName}사이즈${optionText} ${quantity}잔, ` +
    `총 ${formatPrice(total)}원 주문이 접수되었습니다!`;

  // (5) 화면에 표시
  // textContent를 쓰면 사용자가 이름에 HTML 태그를 넣어도 글자 그대로만 보여서 안전합니다.
  orderResult.textContent = message;
  orderResult.hidden = false; // 숨겨져 있던 영역 보이기

  // 메시지가 화면 밖에 있을 수 있으니 메시지 쪽으로 스크롤
  orderResult.scrollIntoView({ behavior: 'smooth', block: 'center' });
});


/* -----------------------------------------
   8. 다시 작성 버튼 (form의 reset 이벤트)
   - 버튼이 type="reset"이라서, 브라우저가 모든 입력칸을 HTML에 처음 적힌 값으로 되돌립니다.
     → 사이즈는 checked가 붙은 M, 수량은 value="1"로 자동 복귀
   - 단, 예상 금액과 주문 확인 메시지는 우리가 직접 초기화해야 합니다.
   ----------------------------------------- */
orderForm.addEventListener('reset', function () {
  // reset 이벤트는 "값이 되돌려지기 직전"에 발생합니다.
  // setTimeout(..., 0)으로 아주 잠깐 미뤄서, 값이 다 되돌려진 뒤에 금액을 다시 계산합니다.
  setTimeout(function () {
    updateTotalPrice(); // 음료가 미선택 상태로 돌아갔으므로 0원이 표시됨
  }, 0);

  // 주문 확인 메시지 지우고 다시 숨기기
  orderResult.textContent = '';
  orderResult.hidden = true;
});


/* -----------------------------------------
   9. 페이지가 처음 열렸을 때 금액 한 번 표시
   ----------------------------------------- */
updateTotalPrice();
