// 모바일판 파트 III 컴포넌트 카탈로그.
// 항목 = 7칸. 앞 5칸은 펼쳐서, 뒤 2칸은 접어서 렌더된다(app.js renderItem):
//   펼침: 정의 / 완성 모습 / 만드는 법 / 주의사항 / 그려도 안 나가는 것
//   접힘: 변환 결과 XML(개발자 대조용) / 치수·색(템플릿 룩 재현용)
// ※ id·chapter·index 는 PC판(data/registry.js)과 **같게** 유지한다 —
//    조각 파일명이 id 기준이고, 두 페이지를 오갈 때 같은 자리를 찾게 하기 위해서다.
// ※ 모바일에 대응 형태가 없는 항목도 지우지 않는다. summary 첫 줄에 대체법을 적는다.
// ※ 값 출처: 사양문서_XML→Figma_생성_모바일.md → 인수인계 문서 → base_mobile.css → 375 렌더 실측.
//    짐작으로 채우지 않는다. 모르는 값은 「모바일 미확정」이라고 적는다.

window.REGISTRY = [

  /* ===================== 6장. 레이아웃 ===================== */

  {
    chapter: 6, index: 1, id: 'split',
    name: '분할 레이아웃 (split)',
    summary: '화면의 한 영역을 좌우로 나눠 서로 다른 내용을 나란히 두는 레이아웃. <b>모바일에서도 가로 2단이 그대로 유지됩니다</b> — 나눠 갖는 폭은 화면 375가 아니라 <code>lybox</code>가 실제로 쓰는 <b>335</b>(좌우 여백 20씩을 뺀 폭)라서, 패널 하나가 약 200, 그 안의 그리드가 약 160까지 좁아집니다.',
    capture: null,
    figmaNodeId: '(모바일 미확정 — 분할 레이아웃 전용 노드 id 를 어느 문서에서도 찾지 못했습니다)',

    build: {
      tree: `split_group_lybox        가로 · 가로FILL          ← 모바일에서도 가로입니다
├ panel1_group           가로FILL (약 200)
│  ├ tit1_group_titbox
│  │  ├ title_bar        (장식 — 매핑 안 됨)
│  │  └ title_textbox_tit_main
│  └ grid1_group_gvwbox
│     └ data1_gridview   헤더행 1 + 바디행 2(자세한 내용은 11장)
└ panel2_group           (panel1_group과 완전히 동일한 구조)`,
      points: [
        {
          t: '컨테이너의 세 번째 조각에 <code>lybox</code> 지정',
          d: '<code>split_group_lybox</code>처럼 그룹 레이어 이름의 세 번째 조각(클래스 자리)에 <code>lybox</code>를 지정하면 하위 항목이 분할 배치됩니다. <b>이름 규칙은 PC와 완전히 동일합니다.</b>',
        },
        {
          t: '방향을 지정하지 않은 <code>lybox</code>는 모바일에서도 가로',
          d: '<code>horizontal</code>·<code>vertical</code>을 붙이지 않은 <code>lybox</code>에는 모바일 전용 규칙이 걸리지 않습니다. 기본값 그대로 <b>가로로 나뉘며, 375에서도 세로로 쌓이지 않습니다.</b> 패널 사이 간격은 16입니다(375 렌더 실측).',
        },
        {
          t: '패널이 <code>titbox</code>를 품으면 카드가 됩니다',
          d: '모바일 CSS는 <code>titbox</code>를 직속 자식으로 가진 그룹을 <b>흰 배경 카드</b>로 그립니다(안쪽 여백 24/20). 패널에 클래스를 주지 않아도 구조만으로 적용되므로, Figma에도 패널을 카드 모양으로 그려 결과와 맞춥니다.',
        },
        {
          t: '패널 비율은 <code>col_2</code>~<code>col_9</code>로 지정',
          d: '패널 폭은 <b>클래스가 결정합니다.</b> 7:3 비율이 필요하면 각 패널 이름 끝에 <code>col_7</code>·<code>col_3</code>을 지정합니다. 숫자는 상대 비율이므로 합계가 10일 필요는 없습니다. px 고정폭이 필요한 경우에만 다음 항목의 <code>col_fix</code>를 사용합니다.',
        },
        {
          t: '패널 순서는 레이어 순서를 따름',
          d: '좌측 패널을 먼저, 우측 패널을 이후 순서로 배치합니다. 캔버스상 위치와 무관하게 레이어 패널의 순서가 좌우 배치 순서를 결정합니다(4장 공통 규칙).',
        },
      ],
    },
    pitfalls: [
      '<b>375에서는 패널이 매우 좁아집니다.</b> 375 렌더 실측으로 패널 하나가 약 200, 그 안의 그리드가 약 160입니다. <b>기준 폭은 375가 아닙니다</b> — <code>lybox</code>가 쓰는 폭은 좌우 여백 20씩을 뺀 <b>335</b>이고, 여기서 패널 사이 간격 16을 빼 둘이 나누면 한 칸이 약 160입니다(패널 상자가 좌우 20씩을 뚫고 나가 200으로 잡힙니다). 컬럼이 서너 개만 되어도 헤더 글자가 잘리므로, 분할이 꼭 필요한지 먼저 확인합니다.',
      '<b>세로로 쌓고 싶다면 <code>lybox</code>를 쓰지 않고 그냥 위아래로 배치합니다.</b> 뒤에 나오는 셔틀과 달리 무클래스 <code>lybox</code>에는 세로 전환 규칙이 아직 적용돼 있지 않습니다(모바일 인수인계 §1-6d의 「남은 관찰」).',
      '<b>Figma에도 가로 2단으로 그립니다.</b> 모바일은 그린 대로 나가는 것이 원칙이므로, 결과가 가로인 이 항목은 Figma도 가로여야 합니다. 셔틀과 반대 방향의 판단이니 혼동하지 않습니다.',
      '<b>병렬 배치를 전달하는 수단은 <code>lybox</code>뿐입니다.</b> Figma에서 가로로 배치해도 오토레이아웃 방향은 결과에 실리지 않으므로(4장), 이 그룹이 없으면 세로로 배치됩니다.',
    ],
    limits: [
      '비율은 <code>col_2</code>~<code>col_9</code>의 정수 단위로만 지정할 수 있습니다. 55:45 같은 세부 비율, 퍼센트, 최소·최대 폭은 지정할 수 없습니다.',
      '375에서 각 패널이 실제로 몇 px이 되는지는 CSS가 정합니다. Figma에서 패널 폭을 조정해도 <code>col_*</code> 클래스가 없으면 결과에 실리지 않습니다.',
    ],
    xmlOut: {
      note: '<b>변환 결과 XML은 PC와 동일합니다.</b> 그리드(<code>gvwbox</code> 내부) 세부 규칙은 11장에서 다루므로 여기서는 축약했습니다.',
      code: `<xf:group class="lybox">
  <xf:group>
    <xf:group class="titbox">
      <w2:textbox class="tit_main" label="타이틀"> … </w2:textbox>
    </xf:group>
    <xf:group class="gvwbox">
      <w2:gridView autoFit="allColumn" …> … </w2:gridView>
    </xf:group>
  </xf:group>
  <xf:group>
    <xf:group class="titbox"> … </xf:group>
    <xf:group class="gvwbox"> … </xf:group>
  </xf:group>
</xf:group>`,
      points: [
        '패널 그룹(<code>panel1_group</code> 등)은 class 없이 <code>&lt;xf:group&gt;</code>으로 출력됩니다. 카드 모양은 이 구조를 CSS가 읽어 그리는 것이며, XML에는 카드용 클래스가 생기지 않습니다.',
        '<code>lybox</code>에 방향 클래스가 없습니다. <b>방향 클래스의 부재가 기본값(가로)을 의미</b>하며, 모바일에서도 이 기본값이 그대로 가로로 그려집니다.',
      ],
    },
  },

  {
    chapter: 6, index: 2, id: 'split-fixed',
    name: '분할(고정) 레이아웃 (split-fixed)',
    summary: '분할 레이아웃과 구조가 같고, 한쪽 패널의 폭만 px로 고정해 나머지가 잔여 공간을 채우는 레이아웃. <b>모바일에서는 고정폭이 375를 그대로 갉아먹으므로 값을 PC보다 작게 잡아야 합니다.</b>',
    capture: null,
    figmaNodeId: '(모바일 미확정 — 분할 레이아웃 전용 노드 id 를 어느 문서에서도 찾지 못했습니다)',

    build: {
      tree: `split_group_lybox         가로 · 가로FILL
├ panel1_group_col_fix    폭 200(고정, Fixed 사이징)   ← 375에서는 반대편 패널 안이 약 159만 남습니다
│  ├ tit1_group_titbox
│  └ grid1_group_gvwbox   그리드(11장)
└ panel2_group            남은 폭 전부 (panel1과 동일 구조)`,
      points: [
        {
          t: '<code>col_fix</code>가 폭을 결과에 출력',
          d: '<code>col_fix</code>를 지정한 패널만 Figma에서 잰 폭이 <code>style="width:200px"</code>로 결과에 실립니다. 나머지 패널에는 <code>style</code>이 붙지 않습니다.',
        },
        {
          t: '고정 패널은 Fixed 사이징 필수',
          d: 'Fill로 지정하면 Figma 화면상 차이는 없으나 결과 <code>style</code>에 <code>width</code>가 출력되지 않습니다.',
        },
        {
          t: '고정폭 값은 375 기준으로 다시 잡습니다',
          d: '375 렌더 실측입니다. <b>6.1과 같은 기준으로 읽습니다</b> — <b>바깥 상자</b>는 고정 패널 <b>200</b> · 나머지 패널 <b>약 199</b>(패널 사이 간격 16), 그 <b>안쪽 그리드</b>는 각각 <b>160</b> · <b>약 159</b>입니다. 패널 상자가 좌우 여백 20씩을 뚫고 나가므로 바깥 상자와 안쪽 폭이 이만큼 벌어집니다. PC 화면에서 쓰던 고정폭을 그대로 옮기면 반대편 패널이 사실상 사라집니다.',
        },
        {
          t: '<code>col_fix</code>는 한쪽 패널에만 지정',
          d: '나머지 패널이 잔여 공간을 채웁니다. 양쪽 모두 고정하면 두 폭의 합이 <code>lybox</code> 폭과 어긋나 여백이 남거나 초과됩니다.',
        },
      ],
    },
    pitfalls: [
      '<b><code>col_fix</code> 패널의 사이징은 Fixed로 지정합니다.</b> Fill이면 결과에 폭이 실리지 않아 균등 분할로 나갑니다.',
      '<b><code>col_fix</code>는 <code>lybox</code> 직속 패널 이름에 지정합니다.</b> 하위 레이어에 지정하면 그 레이어의 폭만 고정되고 패널 배치는 바뀌지 않습니다.',
      '<b>375를 넘는 고정폭을 쓰지 않습니다.</b> 어떤 레이어든 폭이 375를 넘으면 버그입니다(1장). 고정폭은 그 규칙을 가장 쉽게 깨는 자리입니다.',
    ],
    limits: [
      '폭은 px 정수값만 출력됩니다. 퍼센트 등의 상대값과 최소·최대 폭은 지정할 수 없습니다.',
      '분할 레이아웃의 제약이 동일하게 적용됩니다 — 375에서 패널이 좁다는 점, 세로 전환 규칙이 없다는 점(6.1 참조).',
    ],
    xmlOut: {
      note: '<b>변환 결과 XML은 PC와 동일합니다.</b> 폭이 출력되는 위치를 확인할 수 있게 축약해 표기했습니다.',
      code: `<xf:group class="lybox">
  <xf:group class="col_fix" style="width:200px">
    <xf:group class="titbox"> … </xf:group>
    <xf:group class="gvwbox"> … </xf:group>
  </xf:group>
  <xf:group>
    <xf:group class="titbox"> … </xf:group>
    <xf:group class="gvwbox"> … </xf:group>
  </xf:group>
</xf:group>`,
      points: [
        '<code>col_fix</code> 패널에만 <code>style="width:200px"</code>가 출력되며, 나머지 패널에는 <code>style</code> 속성이 없습니다.',
        '폭 값은 Figma 측정값을 정수 px로 반올림한 값입니다. <b>모바일에서도 이 규칙은 같으므로, Figma에 그린 폭이 그대로 375 화면을 나눕니다.</b>',
      ],
    },
  },

  {
    chapter: 6, index: 3, id: 'shuttle-h',
    name: '셔틀(가로) (shuttle-h)',
    summary: '두 목록 사이에 이동 버튼을 두어 항목을 옮기는 레이아웃. <b>모바일에서는 가로로 놓이지 않고 세로 스택으로 그려집니다</b> — 375px에 목록 두 개를 가로로 넣으면 각 164px밖에 되지 않기 때문입니다.',
    capture: null,
    figmaNodeId: '15537:5629 (template_Mobile · shuttle_group_lybox horizontal)',

    build: {
      tree: `shuttle_group_lybox horizontal   세로 · 가로FILL(375) · gap 8   ← 이름은 horizontal, 배치는 세로
├ shuttleA_group_gvwbox          가로FILL · 세로HUG
│  └ shA_gridview_gvw            헤더행 1 + 바디행 2(11장)
├ shuttle_group_ly_btn           가로 · 가로FILL · 양축 가운데 · gap 4
│  ├ next_button_btn_cm right icon   48 × 48 · 아이콘 전용(텍스트 레이어 없음)
│  └ prev_button_btn_cm left icon    48 × 48 · 아이콘 전용
└ shuttleB_group_gvwbox          (shuttleA_group_gvwbox와 완전히 동일한 구조)`,
      points: [
        {
          t: '<code>horizontal</code>을 붙이면 오히려 <b>세로로 쌓입니다</b>',
          d: '모바일 CSS는 <code>lybox horizontal</code>에만 세로 스택 규칙을 겁니다. 이름과 결과가 반대로 보이지만 <b>클래스는 <code>horizontal</code> 그대로 두는 것이 맞습니다</b> — 클래스의 출처는 정본 XML이고, 보이는 모양만 모바일에서 바꾼 것이기 때문입니다.',
        },
        {
          t: '이동 버튼 줄은 가로로 눕습니다',
          d: 'PC에서 버튼을 세로로 쌓던 <code>ly_btn</code>이 모바일에서는 <b>가로 한 줄</b>이 되고 폭 100%에 가운데 정렬됩니다(375 렌더 실측: 줄 높이 48). Figma에서도 가로로 그립니다.',
        },
        {
          t: '화살표 글리프는 ↓ ↑ 로 보입니다',
          d: '클래스는 <code>right</code>·<code>left</code>인데 화면에는 <b>아래·위 화살표</b>가 그려집니다. 「다음 = 아래로 보내기 ↓」, 「이전 = 위로 되돌리기 ↑」로 뜻이 맞습니다. Figma의 아이콘도 <code>ico_Down</code>·<code>ico_Up</code>으로 바꿔 결과와 맞춰 두었습니다.',
        },
        {
          t: '이동 버튼은 아이콘 전용 48 × 48',
          d: '아이콘 전용 버튼(<code>icon</code> 토큰이 붙은 버튼)은 모바일에서 <b>48 × 48 · 모서리 8 · 아이콘 20</b>입니다(디자인 템플릿 재실측, <code>Button/Icon</code> 15382:2774). 버튼 안에 텍스트 레이어를 두지 않습니다.',
        },
      ],
    },
    pitfalls: [
      '<b>가로로 그려 두면 Figma와 실제 화면이 어긋납니다.</b> 모바일은 그린 대로 나가는 것이 원칙이므로 <b>렌더 결과대로</b> 세로로 그립니다.',
      '<b>클래스 <code>horizontal</code>·<code>right</code>·<code>left</code>는 바꾸지 않습니다.</b> 세로로 보인다고 <code>vertical</code>로, 아래 화살표로 보인다고 <code>down</code>으로 고치면 정본 XML과 어긋납니다. 바뀐 것은 CSS가 그리는 모양뿐입니다.',
      '<b>세로로 바꾸면 목록의 높이 사이징을 다시 봅니다.</b> 가로 배치 시절의 고정 높이가 남아 있으면 목록이 눌려 납작해집니다 — 목록·패널·<code>lybox</code>를 전부 세로 HUG로 풀어야 합니다(실제로 30px로 눌렸던 사고가 있었습니다).',
      '<b>이동 버튼 안에는 텍스트 레이어를 두지 않습니다.</b> 「다음」·「이전」 같은 텍스트를 넣으면 아이콘 전용이 아니라 라벨 버튼으로 출력됩니다.',
    ],
    limits: [
      '두 목록 사이의 버튼 배치와 화살표 회전은 CSS가 정합니다. Figma에서 위치를 잡아도 결과 XML에는 실리지 않습니다.',
      '이동 버튼의 개수와 아이콘 종류는 클래스 조합(<code>btn_cm</code> + 방향 + <code>icon</code>)으로만 지정됩니다(13장).',
      '좌우(모바일에서는 위아래) 목록의 항목 선택·이동 상태는 정적 XML의 표현 대상이 아닙니다.',
    ],
    xmlOut: {
      note: '<b>변환 결과 XML은 PC와 동일합니다.</b> 세로 스택은 <code>base_mobile.css</code>가 만듭니다 — XML만 보고는 PC와 구분되지 않습니다.',
      code: `<xf:group class="lybox horizontal">
  <xf:group class="gvwbox">
    <w2:gridView autoFit="allColumn" class="gvw" …> … </w2:gridView>
  </xf:group>
  <xf:group class="ly_btn">
    <w2:button class="btn_cm right icon">
      <w2:textbox tagname="span" label=""></w2:textbox>
    </w2:button>
    <w2:button class="btn_cm left icon">
      <w2:textbox tagname="span" label=""></w2:textbox>
    </w2:button>
  </xf:group>
  <xf:group class="gvwbox">
    <w2:gridView autoFit="allColumn" class="gvw" …> … </w2:gridView>
  </xf:group>
</xf:group>`,
      points: [
        '<code>class="lybox horizontal"</code>이 그대로 나갑니다. <b>모바일에서 세로로 보이는 것은 CSS의 결과이지 XML의 차이가 아닙니다.</b>',
        '<code>ly_btn</code> 내부 버튼 두 개는 텍스트 하위 항목이 없어 라벨이 빈 값(<code>label=""</code>)으로 출력됩니다.',
        '하위 항목이 3개(목록·<code>ly_btn</code>·목록)이며, 패널이 2개인 분할 레이아웃과 구성이 다릅니다.',
      ],
    },
  },

  {
    chapter: 6, index: 4, id: 'shuttle-v',
    name: '셔틀(세로) (shuttle-v)',
    summary: '셔틀(가로)를 상하로 전환한 레이아웃. <b>모바일에서는 셔틀(가로)와 육안상 구분이 없습니다</b> — 가로형도 세로 스택으로 그려지기 때문입니다. 결과 XML만 다릅니다.',
    capture: null,
    figmaNodeId: '(모바일 미확정 — 세로형 전용 노드 id 미확인. 가로형 15537:5629 와 렌더 결과가 같습니다)',

    build: {
      tree: `shuttle_group_lybox vertical    세로 · 가로FILL(375) · gap 8
├ shuttleA_group_gvwbox         가로FILL · 세로HUG
│  └ shA_gridview_gvw           (11장)
├ shuttle_group_ly_btn          가로 · 가로FILL · 양축 가운데
│  ├ up_button_btn_cm up icon   48 × 48 · 아이콘 전용
│  └ down_button_btn_cm down icon
└ shuttleB_group_gvwbox         (shuttleA_group_gvwbox와 완전히 동일한 구조)`,
      points: [
        {
          t: '<code>vertical</code>은 PC에서만 배치를 바꿉니다',
          d: '모바일에서는 <code>horizontal</code>도 세로로 쌓이므로, 두 항목의 <b>화면 결과가 같습니다.</b> 그래도 클래스는 원래 의도대로(<code>vertical</code>) 적어야 PC로 되돌렸을 때 맞습니다.',
        },
        {
          t: '버튼은 방향 토큰만 다릅니다',
          d: '<code>up</code>·<code>down</code>을 씁니다. 가로형과 마찬가지로 아이콘 전용 48 × 48이며 텍스트 레이어를 두지 않습니다.',
        },
        {
          t: '패널 순서는 위에서 아래로',
          d: '레이어 순서가 곧 위아래 순서입니다. 이동 버튼 줄은 두 목록 사이의 순서에 둡니다.',
        },
      ],
    },
    pitfalls: [
      '<b>화면이 같다고 두 항목을 섞어 쓰지 않습니다.</b> 모바일에서는 구분이 안 되지만 결과 XML의 클래스가 다르고, 같은 XML을 PC로 볼 때 배치가 달라집니다.',
      '<b>버튼 위치와 클래스를 함께 맞춥니다.</b> 위쪽 버튼이 <code>up</code>, 아래쪽 버튼이 <code>down</code>입니다. 위치만 바꾸고 클래스를 그대로 두면 화살표와 동작이 어긋납니다.',
      '<b>목록은 세로 HUG로 둡니다.</b> 고정 높이가 남아 있으면 세로 스택에서 목록이 눌립니다(6.3과 같은 사고).',
    ],
    limits: [
      '두 목록의 세로 비율(예: 위 60%·아래 40%)은 지정할 수 없습니다. 폭에는 <code>col_fix</code>·<code>col_2</code>~<code>col_9</code>가 있으나 높이에 대응하는 클래스는 없습니다.',
      '이동 버튼 종류와 개수는 13장 클래스 규칙 범위 내에서만 지정할 수 있습니다.',
    ],
    xmlOut: {
      note: '<b>변환 결과 XML은 PC와 동일합니다.</b> 셔틀(가로)와의 차이는 <code>class</code> 값(<code>vertical</code>, <code>up</code>/<code>down</code>) 뿐입니다.',
      code: `<xf:group class="lybox vertical">
  <xf:group class="gvwbox">
    <w2:gridView autoFit="allColumn" class="gvw" …> … </w2:gridView>
  </xf:group>
  <xf:group class="ly_btn">
    <w2:button class="btn_cm up icon">
      <w2:textbox tagname="span" label=""></w2:textbox>
    </w2:button>
    <w2:button class="btn_cm down icon">
      <w2:textbox tagname="span" label=""></w2:textbox>
    </w2:button>
  </xf:group>
  <xf:group class="gvwbox">
    <w2:gridView autoFit="allColumn" class="gvw" …> … </w2:gridView>
  </xf:group>
</xf:group>`,
      points: [
        '하위 항목 3개(목록·<code>ly_btn</code>·목록) 구조는 셔틀(가로)와 동일합니다.',
        '<b>이 XML과 6.3의 XML은 화면에서 구분되지 않습니다.</b> 검수는 캔버스가 아니라 결과 XML의 <code>class</code>로 합니다.',
      ],
    },
  },

  /* ===================== 7장. 제목 ===================== */

  {
    chapter: 7, index: 1, id: 'pgtbox',
    name: '페이지 타이틀 (pgtbox)',
    summary: '화면 최상단의 제목 줄. <b>모바일에서는 경로(브레드크럼)를 넣지 않습니다</b> — 화면에 보이는 대로 그린다는 원칙과 XML 규격이 2줄 브레드크럼에서 양립하지 않아 모바일은 제외로 확정했습니다. 구성은 <b>[타이틀, 아이콘] 한 줄</b>입니다.',
    capture: null,
    figmaNodeId: '15537:5620 (template_Mobile · pgtbox) · 마스터 15382:5626',

    build: {
      tree: `pgt_group_pgtbox                  375 × 60 · 화면 끝까지 · padding 0 20 · gap 4
├ pgttitle_textbox_pgt_tit        "화면타이틀"
└ fav_button_btn_cm fav icon      아이콘 전용(텍스트 레이어 없음)`,
      points: [
        {
          t: '항상 최상단, 폭은 화면 끝까지 375',
          d: '<code>pgtbox</code>는 좌우 여백 없이 <b>375 전체</b>를 쓰고, 안쪽 여백 20이 내용을 335로 만듭니다. 높이 60 · 배경 흰색 · <b>아래쪽에만</b> 1px <code>#C4CDD5</code> 선입니다(사양문서 §5-1, 375 렌더 실측 일치).',
        },
        {
          t: '브레드크럼 레이어를 만들지 않습니다',
          d: 'PC의 <code>breadcrumb</code> 그룹과 그 안의 <code>home</code>·뎁스 항목·구분자를 <b>모두 그리지 않습니다.</b> 모바일 <code>pgtbox</code>의 자식은 타이틀과 우측 아이콘 버튼 둘뿐입니다.',
        },
        {
          t: '타이틀은 <code>pgt_tit</code> 클래스',
          d: '레이어 이름 세 번째 조각에 <code>pgt_tit</code>를 지정합니다. 정본 값은 <b>18 Bold <code>#161C24</code></b>입니다(사양문서 §5-1).',
        },
        {
          t: '우측 버튼은 아이콘 전용',
          d: '<code>fav_button_btn_cm fav icon</code>처럼 클래스에 <code>icon</code> 토큰을 넣고 <b>텍스트 레이어를 두지 않습니다.</b> 아이콘 그림은 <code>fav</code> 같은 아이콘 클래스가 결정하며, Figma에 아이콘을 그려도 XML에는 나가지 않습니다.',
        },
      ],
    },
    pitfalls: [
      '<b>PC 화면을 모바일로 옮길 때 브레드크럼이 사라지는 것은 정상입니다.</b> 규칙상 제외이므로 오류가 아니며, 빠졌다고 다시 그려 넣지 않습니다.',
      '<b><code>pgtbox</code>에 좌우 여백을 두 번 주지 않습니다.</b> 화면 끝까지 늘어난 뒤 안쪽 여백 20으로 335를 만드는 구조입니다. 바깥 컨테이너의 여백과 겹치면 내용이 안쪽으로 두 번 밀립니다.',
      '<b>화면에 그려지는 제목 글자 크기가 정본과 다릅니다.</b> 정본은 18 Bold인데, 현재 <code>base_mobile.css</code>의 「모든 <code>textbox</code>는 16」 규칙이 뒤에서 덮어 <b>화면에는 16</b>으로 나옵니다(375 렌더 실측). <b>Figma는 정본대로 18로 그립니다.</b>',
      '<b>우측 버튼은 아이콘 전용 공통 규격 <code>48 × 48</code> · 모서리 8 · 아이콘 20으로 그립니다</b>(375 렌더 실측 — <code>live-m/pgtbox.html</code>의 <code>btn_cm fav icon</code>이 48 × 48 · <code>border-radius:8px</code>). 7.2 · 13.1 · 21.1이 적은 값과 같습니다.<br>⚠️ <b>정본 문서가 이 값에서 두 갈래로 갈려 있습니다</b> — 사양문서 §5-1은 <code>pgtbox</code> 우측 버튼을 「24 × 24 · 모서리 4 · 아이콘 16」이라 적고, 같은 문서 §5-6의 배치 규칙 표는 <code>pgtbox</code> 헤더 버튼을 「Small <b>48</b>」 버킷에 넣습니다(아이콘 전용은 따로 「32 × 32」라 적혀 있습니다). <b>셋 다 갱신 전 값이며, 이 가이드는 21.1이 선언한 대로 화면에 실제로 나오는 현행 값을 씁니다.</b>',
    ],
    limits: [
      '아래쪽 구분선과 배경색은 CSS가 그립니다. Figma에서 선을 지우거나 색을 바꿔도 결과에 실리지 않습니다.',
      '뎁스별 아이콘, 현재 뎁스 강조 같은 브레드크럼 관련 표현은 모바일에 아예 존재하지 않습니다.',
      '아이콘 그림은 클래스가 결정합니다. 클래스에 없는 아이콘을 Figma에 그려도 화면에 나오지 않습니다.',
    ],
    xmlOut: {
      note: '<b>PC와 결과가 다른 항목입니다.</b> 모바일에는 <code>breadcrumb</code> 그룹과 그 안의 <code>li</code>가 통째로 없습니다.',
      code: `<xf:group class="pgtbox">
  <w2:textbox class="pgt_tit" label="화면타이틀"></w2:textbox>
  <w2:button class="btn_cm fav icon">
    <w2:textbox tagname="span" label=""></w2:textbox>
  </w2:button>
</xf:group>`,
      points: [
        '<b><code>&lt;xf:group class="breadcrumb"&gt;</code>가 없습니다.</b> PC 결과와 비교할 때 가장 먼저 확인할 자리입니다.',
        '아이콘 버튼은 텍스트 하위 항목이 없어 라벨이 빈 값(<code>label=""</code>)으로 출력됩니다.',
        '<code>pgtbox</code>의 자식은 <b>두 개</b>입니다. 셋 이상이면 브레드크럼이나 불필요한 그룹이 남아 있는 것입니다.',
      ],
    },
  },

  {
    chapter: 7, index: 2, id: 'tit-h3',
    name: '타이틀(h3) (tit-h3)',
    summary: '영역(카드) 안의 최상위 제목. 앞에 막대 장식이 붙으며 <code>tit_main</code> 클래스로 지정합니다. <b>모바일에서는 줄 높이가 최소 48이고, 우측 버튼은 아이콘 전용으로 그려집니다.</b>',
    capture: null,
    figmaNodeId: '15393:29301 (template_Mobile · titbox h3/h4 블록) · 마스터 titbox 15382:5646 의 tit3 변형 15382:5647',

    build: {
      tree: `tit3_group_titbox              335 × 최소 48 · padding 0 · gap 8 · 가로 한 줄
├ titleft_group_lt             제목 묶음 · 가로FILL(rt를 오른쪽으로 미는 장치)
│  ├ title_bar                 (장식 — 매핑 안 됨, 막대는 CSS가 그립니다)
│  ├ title_textbox_tit_main    "타이틀(h3)"
│  └ count_group_total_count   "총 N 건" 칩(선택)
└ rt_group_rt                  우측 정렬 · gap 8
   ├ dl_button_btn_cm download icon   아이콘 전용
   └ add_button_btn_cm row_add icon   아이콘 전용`,
      points: [
        {
          t: '폭은 335, 좌우 여백은 주지 않습니다',
          d: '<code>titbox</code>는 카드 안쪽에 들어가는 블록이라 <b>화면 끝까지 늘어나지 않습니다.</b> 좌우 인셋은 카드가 담당하므로 <code>titbox</code>에 여백 20을 또 주면 이중이 됩니다(사양문서 §5-2).',
        },
        {
          t: '줄 높이는 최소 48',
          d: '우측 아이콘 버튼이 48이 되면서 <code>titbox</code> 실측도 <b>32에서 48로 올라갔습니다</b>(디자인 템플릿 재실측). 375 렌더 실측도 48입니다.',
        },
        {
          t: '제목 묶음에 <code>lt</code>를 지정합니다',
          d: '<code>titleft_group_lt</code>의 <code>lt</code>가 <b>우측 버튼 묶음을 오른쪽 끝으로 미는 유일한 장치</b>입니다. 벗기면 버튼이 제목 바로 옆에 붙습니다.',
        },
        {
          t: '막대와 건수 칩',
          d: '제목 앞 막대(4 × 20)는 <code>tit_main</code> 클래스가 CSS로 그립니다 — Figma에는 그리되 결과에는 나가지 않습니다. 건수 칩은 <code>count_group_total_count</code>로 64 × 24 · 모서리 4입니다(사양문서 §5-2).',
        },
        {
          t: '우측 버튼은 아이콘 전용 48 × 48',
          d: '모바일의 <code>rt</code> 툴바 버튼은 <b>라벨 없이 아이콘만</b> 그려집니다. 크기는 48 × 48 · 모서리 8 · 아이콘 20입니다(디자인 템플릿 재실측).',
        },
      ],
    },
    pitfalls: [
      '<b>아이콘은 아래 목록의 클래스에만 그려집니다</b> — <code>copy</code> <code>row_add</code> <code>row_del</code> <code>upload</code> <code>download</code> <code>search</code> <code>left</code> <code>right</code> <code>up</code> <code>down</code> <code>delete</code> <code>calendar</code> <code>guide</code> <code>refresh</code> <code>save</code> <code>fav</code> <code>link</code> <code>print</code>. 이 목록에 없는 버튼(예 「취소」)에 <code>icon</code>만 붙이면 <b>빈 사각형</b>이 됩니다 — 아이콘 클래스를 주거나 텍스트 버튼으로 남깁니다.',
      '<b>우측 버튼은 넘칠 때만 아래 줄로 내려갑니다.</b> 버튼이 3개여도 폭이 남으면 <b>한 줄에 그대로 있습니다</b>(CSS 실측: 3개 = 필요폭 280 / 가용 375 → 1줄, 6개 = 448 → 2줄). Figma도 <b>실제로 넘치는지 재 보고</b> 그 결과대로 그립니다 — 개수만 세어 미리 두 줄로 그리지 않습니다.<br>⚠️ 사양문서 §5-2의 「rt 버튼이 3개 이상이면 줄바꿈된다」는 <b>2026-08-05에 개정되기 전 문장</b>입니다. 그때는 rt가 텍스트 버튼이라 3개면 실제로 넘쳤지만, 아이콘 전용으로 바뀌면서 폭 조건으로 규칙이 바뀌었습니다.',
      '<b><code>rt</code> 클래스를 빠뜨리지 않습니다.</b> 버튼의 우측 정렬은 Figma의 정렬 설정이 아니라 이 클래스가 결정합니다.',
      '<b>화면에 그려지는 제목 글자 크기가 정본과 다릅니다.</b> 정본은 18 Bold <code>#212B36</code>인데 현재 CSS의 「모든 <code>textbox</code>는 16」 규칙이 뒤에서 덮어 <b>화면에는 16</b>으로 나옵니다(375 렌더 실측). Figma는 정본대로 18로 그립니다.',
      '<b>아이콘 프레임을 그리는 것만으로는 아이콘 버튼이 되지 않습니다.</b> 클래스에 <code>icon</code> 토큰이 있어야 합니다(13장).',
    ],
    limits: [
      '막대·점 같은 장식은 클래스가 만듭니다. Figma의 장식 레이어는 결과에 나가지 않습니다.',
      '툴팁에 <b>표시되는 문구</b>는 전달할 수 없습니다. 아이콘 영역만 클래스로 전달됩니다.',
      '우측 버튼이 아이콘 전용으로 그려지는 것은 CSS가 정합니다. Figma에 라벨을 써 두어도 화면에는 나오지 않습니다.',
    ],
    xmlOut: {
      note: '<b>변환 결과 XML의 구조는 PC와 같습니다.</b> 아이콘 전용으로 보이는 것은 CSS가 만드는 모습이며 XML에는 나타나지 않습니다.',
      code: `<xf:group class="titbox">
  <xf:group class="lt">
    <w2:textbox class="tit_main" label="타이틀(h3)"></w2:textbox>
  </xf:group>
  <xf:group class="rt">
    <w2:button class="btn_cm download icon">
      <w2:textbox tagname="span" label=""></w2:textbox>
    </w2:button>
    <w2:button class="btn_cm row_add icon">
      <w2:textbox tagname="span" label=""></w2:textbox>
    </w2:button>
  </xf:group>
</xf:group>`,
      points: [
        '<code>title_bar</code>는 결과에 출력되지 않습니다. 막대는 <code>tit_main</code> 클래스가 CSS로 그립니다.',
        '<b>제목 묶음에 <code>lt</code>가 붙었는지 확인합니다.</b> 클래스가 없으면 빈 <code>&lt;xf:group&gt;</code>으로 나가 우측 정렬이 풀립니다.',
        '아이콘 전용 버튼은 라벨이 빈 값입니다. 라벨이 채워져 있으면 텍스트 버튼으로 나갑니다.',
      ],
    },
  },

  {
    chapter: 7, index: 3, id: 'tit-h4',
    name: '타이틀(h4) (tit-h4)',
    summary: 'h3보다 한 단계 아래의 제목. 막대 대신 점 장식이 붙으며 <code>tit_sub</code> 클래스로 지정합니다. <b>구조와 줄 높이는 h3와 같고, 클래스 한 개만 다릅니다.</b>',
    capture: null,
    figmaNodeId: '15393:29301 (template_Mobile · titbox h3/h4 블록) · 마스터 titbox 15382:5646',

    build: {
      tree: `tit4_group_titbox              335 × 최소 48 · padding 0 · gap 8 · 가로 한 줄
├ titleft_group_lt             제목 묶음 · 가로FILL
│  ├ dot                       (장식 — 매핑 안 됨, 점은 CSS가 그립니다)
│  └ title_textbox_tit_sub     "타이틀(h4)"   ← h3와 다른 곳은 여기 하나뿐
└ rt_group_rt                  (h3와 동일)`,
      points: [
        {
          t: 'h3와 h4를 가르는 것은 클래스 하나',
          d: '<code>tit_main</code>이면 h3, <code>tit_sub</code>이면 h4입니다. <b>글자 크기를 줄여도 h4가 되지 않습니다.</b>',
        },
        {
          t: '점 장식도 CSS가 그립니다',
          d: '제목 앞 점은 <code>tit_sub</code> 클래스가 만듭니다. Figma에는 그리되 결과에는 나가지 않습니다.',
        },
        {
          t: '나머지는 h3와 동일',
          d: '줄 높이 최소 48, 폭 335, 좌우 여백 없음, 우측 <code>rt</code> 버튼은 아이콘 전용 48 × 48 — 전부 h3와 같습니다.',
        },
      ],
    },
    pitfalls: [
      '<b>클래스 철자를 확인합니다.</b> <code>tit_main</code>으로 잘못 쓰면 Figma 화면과 무관하게 h3와 같은 크기·굵기로 출력되며, 캔버스에서는 식별되지 않습니다.',
      '<b>h4에서도 <code>rt</code>와 <code>icon</code>을 h3와 동일하게 지정합니다.</b> 우측 정렬에는 <code>rt</code>가, 아이콘에는 <code>icon</code> 토큰이 필요합니다.',
      '<b>화면에 그려지는 글자 크기가 CSS 선언과 다릅니다.</b> <code>base_mobile.css</code>는 <code>tit_sub</code>를 15/600으로 선언하지만 「모든 <code>textbox</code>는 16」 규칙이 뒤에서 덮어 <b>화면에는 16</b>으로 나옵니다(375 렌더 실측). <b>모바일 정본 값은 미확정입니다</b> — 사양문서에 <code>tit_sub</code> 항목이 없습니다.',
    ],
    limits: [
      '점 장식의 크기·색은 CSS 고정값입니다.',
      '툴팁에 표시되는 문구는 tit-h3와 동일하게 전달할 수 없으며, 아이콘 영역만 클래스로 전달됩니다.',
    ],
    xmlOut: {
      note: '<b>변환 결과 XML은 PC와 동일합니다.</b> tit-h3와의 차이는 <code>class</code> 값 하나뿐입니다.',
      code: `<xf:group class="titbox">
  <xf:group class="lt">
    <w2:textbox class="tit_sub" label="타이틀(h4)"></w2:textbox>
  </xf:group>
  <xf:group class="rt">
    <w2:button class="btn_cm download icon">
      <w2:textbox tagname="span" label=""></w2:textbox>
    </w2:button>
  </xf:group>
</xf:group>`,
      points: [
        '<code>class="tit_sub"</code> 한 곳만 tit-h3와 다릅니다.',
        '점 장식 레이어는 결과에 출력되지 않습니다.',
      ],
    },
  },

  /* ===================== 8장. 조회영역 ===================== */

  {
    chapter: 8, index: 1, id: 'schbox',
    name: '조회영역 (schbox)',
    summary: '화면 상단에서 조회 조건을 입력받는 영역. <b>PC와 구조 자체가 다릅니다</b> — PC는 한 행에 <code>라벨 · 필드 · 라벨 · 필드</code>를 가로로 늘어놓고 조회 버튼을 오른쪽에 두지만, <b>모바일은 라벨이 필드 위로 올라가는 세로 스택이고 조회 버튼이 폭 100%</b>입니다.',
    capture: null,
    figmaNodeId: '15537:6274 (template_Mobile · schbox)',

    build: {
      tree: `search_group_schbox            세로 · 375(화면 끝까지) · padding 24 20 · gap 8 · 배경 흰색 · 모서리 0
├ search_group_schbox_inner    세로 · 335 · padding 4 0 · gap 8
│  └ cond_table_tbl            세로 · 335
│     └ row_tr_w2tb_tr         세로 · 335        ← 라벨셀과 값셀이 세로로 쌓입니다
│        ├ cond_th             335 × 24          ← 라벨 줄
│        ├ field_td            335 · gap 8       ← 필드 줄(필드가 폭을 채웁니다)
│        ├ cond_th             335 × 24
│        └ field_td            335
└ search_group_btn_schbox      335 × 48          ← 조회 버튼(폭 100%)`,
      points: [
        {
          t: '라벨은 필드 <b>위</b>에 놓습니다',
          d: 'PC처럼 <code>라벨 | 필드</code>를 가로로 두지 않습니다. 한 행(<code>row_tr_w2tb_tr</code>) 안에서 <b>라벨셀 → 값셀 순서로 세로로 쌓습니다.</b> 라벨 줄의 높이는 24입니다(사양문서 §5-3).',
        },
        {
          t: '조회영역은 화면 끝까지, 안쪽 내용은 335',
          d: '<code>schbox</code>는 폭 375로 화면 끝까지 늘어나고 안쪽 여백 24/20이 내용을 335로 만듭니다. <b>모서리는 0</b>입니다 — 카드처럼 둥글게 그리지 않습니다.',
        },
        {
          t: '필드는 줄을 꽉 채웁니다',
          d: '폼 필드의 모바일 규격은 <b>높이 48 · 모서리 8 · 글자 16 · 폭 100%</b>입니다(사양문서 §5-4). 한 값셀에 필드를 여러 개 넣으면 그 줄을 나눠 갖고, 넘치면 다음 줄로 내려갑니다.',
        },
        {
          t: '조회 버튼은 폭 100% · 높이 48',
          d: '<code>btn_schbox</code> 그룹과 그 안의 버튼이 <b>둘 다 폭 100%</b>입니다. 버튼 높이는 클래스가 없는 <code>btn_cm</code>의 기본값 48입니다 — <code>lg</code>를 붙이면 56이 됩니다.',
        },
        {
          t: '필수 표시는 <b>별표 <code>*</code></b>',
          d: 'PC는 라벨 앞에 파란 점 ●을 붙이지만 <b>모바일은 별표 <code>*</code></b>입니다(사양문서 §5-3). 라벨 텍스트에 <code>req</code> 클래스를 지정하면 CSS가 그립니다.',
        },
      ],
    },
    pitfalls: [
      '<b>PC 조회영역을 복사해 값만 바꾸지 않습니다.</b> 이 항목은 PC와 <b>구조가 다른</b> 몇 안 되는 자리입니다. 가로 배치를 그대로 두면 Figma와 화면이 통째로 어긋납니다.',
      '<b>모든 행에 <code>w2tb_tr</code>을 붙입니다.</b> 빠지면 라벨과 필드가 각각 줄바꿈되어 [라벨/입력] 짝이 깨집니다.',
      '<b><code>th</code>·<code>td</code>를 단일 토큰으로 쓰지 않습니다.</b> 매핑에 실패하므로 <code>cond_th</code>·<code>field_td</code>처럼 앞에 접두어를 붙입니다.',
      '<b>라벨셀 폭을 조정해도 모바일 화면은 바뀌지 않습니다.</b> 라벨이 필드 위에 놓이는 세로 스택이라 열 폭이라는 개념이 없습니다. 다만 폭 값 자체는 결과 XML의 <code>colgroup</code>에 그대로 실리므로, PC로 되돌릴 계획이 있으면 값을 맞춰 둡니다.',
      '<b>버튼 아이콘은 레이어가 아니라 클래스가 결정합니다.</b> <code>btn_cm fill search</code>의 <code>search</code>가 돋보기를 그립니다. 색도 클래스가 정합니다 — <code>fill pt</code>여야 파란 버튼(<code>#237AF3</code>)이 됩니다.',
    ],
    limits: [
      '<b>표의 폭은 항상 <code>width:100%</code>로 출력됩니다.</b> 표에서 조정 가능한 값은 라벨셀 폭뿐입니다.',
      '셀렉트는 변환기가 정해진 속성 세트로 출력하므로 <b>레이어 이름의 클래스가 출력되지 않습니다.</b>',
      '라디오는 항목 텍스트만 수집되며 <b>선택 상태는 전달할 수 없습니다.</b>',
      '한 값셀 안에서 필드가 몇 개씩 한 줄에 들어갈지는 CSS가 정합니다. Figma에서 줄을 나눠 그려도 결과가 그대로 따라오지 않습니다.',
    ],
    xmlOut: {
      note: '<b>변환 결과 XML의 구조는 PC와 같습니다.</b> 세로 스택은 <code>base_mobile.css</code>가 만듭니다 — 「PC와 다른 것은 보이는 모습이지 XML이 아니다」가 이 항목의 요점입니다.',
      code: `<xf:group class="schbox">
  <xf:group class="schbox_inner">
    <xf:group tagname="table" class="w2tb tbl" style="width:100%;">

      <xf:group tagname="tr" class="w2tb_tr">
        <xf:group tagname="th" class="w2tb_th">
          <w2:textbox class="req" label="조회조건"></w2:textbox>
        </xf:group>
        <xf:group tagname="td" class="w2tb_td">
          <xf:select1 appearance="minimal" style="width:100%;"> … </xf:select1>
          <xf:select1 appearance="minimal" style="width:100%;"> … </xf:select1>
        </xf:group>
        <xf:group tagname="th" class="w2tb_th"> … </xf:group>
        <xf:group tagname="td" class="w2tb_td">
          <xf:select1 renderType="radiogroup" appearance="full"> … </xf:select1>
        </xf:group>
      </xf:group>

      <xf:group tagname="tr" class="w2tb_tr"> … </xf:group>

    </xf:group>
  </xf:group>
  <xf:group class="btn_schbox">
    <w2:button class="btn_cm fill pt search">
      <w2:textbox tagname="span" label="조회"></w2:textbox>
    </w2:button>
  </xf:group>
</xf:group>`,
      points: [
        '표·행·셀은 모두 <code>xf:group</code>에 <code>tagname</code> 속성이 붙은 형태로 출력되며, HTML의 <code>&lt;table&gt;</code>이 직접 나오지 않습니다.',
        '버튼 라벨은 속성이 아니라 하위 <code>&lt;w2:textbox tagname="span"&gt;</code>으로 출력됩니다.',
        '<b>변환기가 자동으로 만드는 것</b> — 표의 <code>&lt;colgroup&gt;</code>(라벨셀 폭 기준), 셀의 <code>&lt;w2:attributes&gt;</code> 블록, 행의 <code>w2tb_tr</code> 클래스입니다. 위 코드에서는 생략했습니다.',
      ],
    },
  },

  {
    chapter: 8, index: 2, id: 'schbox-adaptive',
    name: '조회영역 — 어댑티브',
    summary: '표 레이어 이름 끝에 <code>w2tb_adaptive_layout</code> 토큰 하나를 더한 것이 8.1과의 유일한 차이입니다. <b>모바일에서는 이 토큰이 있든 없든 화면이 같습니다</b> — 모바일 CSS가 이미 모든 표를 세로로 쌓기 때문입니다.',
    capture: null,
    figmaNodeId: '(모바일 미확정 — 어댑티브 전용 노드 id 미확인. 기준 노드 = schbox 15537:6274)',

    build: {
      tree: `search_group_schbox                        (8.1과 동일)
├ search_group_schbox_inner                (동일)
│  └ cond_table_tbl w2tb_adaptive_layout   ← 8.1과 다른 곳은 여기, 이름 끝의 이 토큰 하나뿐
│     ├ row_tr_w2tb_tr                     8.1의 1번째 행과 글자 하나 다르지 않습니다
│     └ row_tr_w2tb_tr                     8.1의 2번째 행과 글자 하나 다르지 않습니다
└ search_group_btn_schbox                  (동일)`,
      points: [
        {
          t: '표 레이어 이름 끝에 토큰 하나 추가',
          d: '<code>cond_table_tbl</code>을 <code>cond_table_tbl w2tb_adaptive_layout</code>으로 바꿉니다. 클래스는 공백으로 나열하므로 <b>기존 <code>tbl</code>을 지우지 않고 뒤에 붙입니다.</b>',
        },
        {
          t: '모바일에서는 화면 차이가 없습니다',
          d: '<code>base_mobile.css</code>는 <b>어댑티브 구분 없이 모든 표를 1열 세로 스택</b>으로 그립니다. PC에서 이 토큰이 만들던 「라벨 150px + 값 1열」 배치가 모바일에는 없습니다. 즉 <b>토큰의 유무는 모바일 화면에 드러나지 않습니다.</b>',
        },
        {
          t: '그래도 토큰을 정확히 씁니다',
          d: '같은 XML을 PC로 볼 때 배치가 달라지고, 어댑티브 여부는 개발자가 결과 XML로 확인하는 값이기 때문입니다. <b>이 토큰은 자동으로 붙지 않습니다.</b>',
        },
        {
          t: '토큰은 표 레이어에만 지정',
          d: '<code>schbox</code>·<code>schbox_inner</code> 그룹이나 행·셀에 지정하면 적용되지 않습니다.',
        },
      ],
    },
    pitfalls: [
      '<b>검수는 캔버스가 아니라 결과 XML에서 합니다.</b> 두 항목은 Figma에서도 모바일 화면에서도 구분되지 않습니다. 클래스가 빠져도 변환은 오류 없이 끝나고 경고도 없습니다.',
      '<b>제목 텍스트에 「어댑티브」라고 적어도 적용되지 않습니다.</b> 적용 여부는 표 레이어의 클래스로만 결정됩니다. 제목이 「조회테이블(어댑티브)」인데 클래스가 없어 일반 표로 나간 사례가 있습니다.',
      '<b>모바일에서 확인이 안 된다고 토큰을 빼지 않습니다.</b> 화면에 안 보이는 값이라 빠뜨리기 가장 쉬운 자리입니다.',
    ],
    limits: [
      '<b>모바일 화면에서는 어댑티브 적용 여부를 확인할 수 없습니다.</b> 모든 표가 이미 세로 스택이라 차이가 나타나지 않습니다.',
      '어댑티브에서 PC가 쓰던 「라벨열 150px 고정」은 모바일에 적용되지 않습니다. 모바일의 라벨은 폭 335짜리 별도 줄입니다.',
      'schbox의 제약이 동일하게 적용됩니다 — 표 폭 100% 고정, 셀렉트 클래스 미출력, 라디오 선택 상태 미반영(8.1 참조).',
    ],
    xmlOut: {
      note: '<b>변환 결과 XML은 PC와 동일합니다.</b> 8.1의 XML과는 표 태그 한 줄만 다릅니다(<code>class</code>에 <code>w2tb_adaptive_layout</code> 추가).',
      code: `<xf:group class="schbox">
  <xf:group class="schbox_inner">
    <xf:group tagname="table" class="w2tb tbl w2tb_adaptive_layout" style="width:100%;">

      <xf:group tagname="tr" class="w2tb_tr">
        <xf:group tagname="th" class="w2tb_th">
          <w2:textbox class="req" label="조회조건"></w2:textbox>
        </xf:group>
        <xf:group tagname="td" class="w2tb_td"> … </xf:group>
      </xf:group>

      <xf:group tagname="tr" class="w2tb_tr"> … </xf:group>

    </xf:group>
  </xf:group>
  <xf:group class="btn_schbox"> … </xf:group>
</xf:group>`,
      points: [
        '바뀌는 것은 표의 <code>class</code> 속성 하나입니다 — <code>w2tb tbl</code> → <code>w2tb tbl w2tb_adaptive_layout</code>.',
        '행·셀·필드는 8.1과 동일하게 출력됩니다. 어댑티브를 켜도 셀 구조가 바뀌거나 속성이 추가되지 않습니다.',
        '<b>모바일에서는 이 한 줄이 화면에 아무 영향을 주지 않습니다.</b> 그래도 결과 XML에 있어야 하는 값이므로 확인 대상입니다.',
      ],
    },
  },

  /* ===================== 9장. 탭 ===================== */

  {
    chapter: 9, index: 1, id: 'tab-basic',
    name: '기본탭 (tab-basic)',
    summary: '한 영역을 여러 장으로 나눠 전환하는 컴포넌트. 9장의 나머지 여섯 항목은 이 구조에서 한 곳만 바꾼 형태입니다. <b>모바일의 기본탭은 선택된 탭이 파란 칩</b>으로 그려집니다.',
    capture: null,
    figmaNodeId: '(모바일 미확정 — 문서마다 다른 id가 적혀 있습니다. 컴포넌트 <code>Tab/Item</code> = 15382:2793)',

    build: {
      tree: `basic_group_tbcbox              ← 첫 조각 "basic"이 변형을 정합니다(이 항목은 변형 없음)
└ basic_tabcontrol_tbc          탭 줄 높이 50 · padding 4 12 · 간격 0 · 좌측 정렬
   ├ tabhost                    매핑 안 됨 — 변환기가 건너뛰고 안쪽에서 탭을 찾습니다
   │  ├ tab1_tabs               2번째 조각이 "tabs" → 탭 하나 · 높이 42 · 좌우 여백 20 · 모서리 6
   │  │  └ label                "탭1" ← 탭 라벨이 됩니다
   │  └ tab2_tabs … tab5_tabs   (같은 구조로 5개)
   └ content_group              이름에 "content" 포함 → 탭 본문
      └ content_textbox         "탭 컨텐츠 영역" ← 이 안은 실제로 변환됩니다`,
      points: [
        {
          t: '선택된 탭은 <b>파란 칩</b>입니다',
          d: '선택 탭 = 배경 <code>#237AF3</code> · 모서리 6 · 글자 <b>16 Bold 흰색</b>, 비선택 탭 = 배경 흰색 · 글자 16 Regular <code>#637381</code>입니다(375 렌더 실측). <b>PC의 회색 띠 + 칩과도, 예전 모바일의 밑줄형과도 다릅니다</b> — 디자인 템플릿이 바뀌면서 두 타입의 역할이 사실상 맞바뀌었습니다.',
        },
        {
          t: '탭 줄은 왼쪽부터 채웁니다',
          d: '탭 줄 높이 50(칩 42 + 위아래 4) · 안쪽 여백 4/12 · <b>탭 사이 간격 0</b>(칩이 맞붙습니다) · <b>좌측 정렬</b>입니다. 균등 분할이나 우측 정렬이 아닙니다.',
        },
        {
          t: '탭 하나는 두 번째 조각이 <code>tabs</code>인 프레임',
          d: '<code>tab1_tabs</code>처럼 짓습니다. <code>tab</code>(단수)이나 다른 값이면 탭으로 인식되지 않습니다.',
        },
        {
          t: '<code>tabhost</code>는 결과에 나가지 않지만 필수',
          d: '변환기는 <code>tabhost</code> 자체를 건너뛰고 그 안에서 탭을 찾습니다. <b>이 그룹이 없으면 어댑티브(9.7)로 판정</b>되어 형태가 달라집니다.',
        },
        {
          t: '탭 본문은 하나만 그려도 됩니다',
          d: '본문 <code>&lt;w2:content&gt;</code>는 탭 개수만큼 자동 생성되며, 그리지 않은 것은 빈 상태로 나갑니다. <b>탭 본문은 그린 구조가 그대로 유지되는 유일한 위치</b>입니다.',
        },
      ],
    },
    pitfalls: [
      '<b>탭을 <code>tabhost</code> 하위에 배치합니다.</b> <code>tabhost</code>를 지우거나 이름을 바꿔 탭을 탭 컨트롤 직속에 두면 어댑티브(아코디언)로 출력되어 형태가 달라집니다.',
      '<b>탭 이름의 두 번째 조각은 <code>tabs</code>입니다.</b> 철자가 다르면 탭으로 인식되지 않고 일반 그룹으로 나갑니다.',
      '<b>탭 안에서 <code>content</code>는 본문 레이어에만 씁니다.</b> 장식용 그룹을 <code>content_bg</code>로 지으면 그 그룹도 본문으로 계산됩니다.',
      '<b>초기 선택할 탭을 첫 번째에 둡니다.</b> 첫 번째 탭이 항상 선택 상태로 출력되며 선택 상태를 따로 지정할 수 없습니다.',
      '<b>탭이 많으면 탭 줄이 가로로 스크롤됩니다.</b> 375에 다 들어가지 않는 것은 정상이며, 줄바꿈되지 않습니다.',
      '<b>칩 색은 Figma 컴포넌트와 화면이 다릅니다.</b> <code>Tab/Item</code> 컴포넌트에 박힌 값은 <code>#256EF4</code>(PC 파랑)인데 화면에는 모바일 프라이머리 <code>#237AF3</code>으로 그려집니다. 컴포넌트 쪽 변수 연결이 빠진 잔재로 보이며 <b>어느 쪽으로 확정할지는 아직 정해지지 않았습니다</b> — Figma에서 색을 직접 손보기 전에 확인합니다.',
    ],
    limits: [
      '탭별 아이콘, 비활성 탭, 개수 배지는 지정할 수 없으며 라벨 텍스트만 전달됩니다.',
      '선택된 탭의 색과 모양은 클래스(CSS)가 결정합니다. Figma에서 칩 색을 바꿔도 결과에 실리지 않습니다.',
      '탭의 높이·간격·정렬도 CSS 고정값입니다.',
    ],
    xmlOut: {
      note: '<b>변환 결과 XML은 PC와 동일합니다.</b> 파란 칩 모양은 <code>base_mobile.css</code>가 만듭니다.',
      code: `<xf:group class="tbcbox">
  <w2:tabControl class="tbc">
    <w2:tabs id="tabs1" label="탭1"></w2:tabs>
    <w2:tabs id="tabs2" label="탭2"></w2:tabs>
    <w2:tabs id="tabs3" label="탭3"></w2:tabs>
    <w2:tabs id="tabs4" label="탭4"></w2:tabs>
    <w2:tabs id="tabs5" label="탭5"></w2:tabs>
    <w2:content id="content1">
      <w2:textbox label="탭 컨텐츠 영역"></w2:textbox>
    </w2:content>
    <w2:content id="content2"></w2:content>
    <w2:content id="content3"></w2:content>
    <w2:content id="content4"></w2:content>
    <w2:content id="content5"></w2:content>
  </w2:tabControl>
</xf:group>`,
      points: [
        '<code>tabhost</code> 그룹은 결과에 나오지 않으며, 탭이 <code>tabControl</code> 직속으로 올라가 <code>&lt;w2:tabs&gt;</code>가 됩니다.',
        '본문 그룹(<code>content_group</code>)도 결과에 나오지 않습니다. <code>&lt;w2:content&gt;</code>가 그 자리를 대신하며 <b>내부 하위 항목만</b> 옮겨집니다.',
        '<code>&lt;w2:content&gt;</code>는 탭 개수(5개)만큼 생성되며, 그리지 않은 4개는 빈 상태로 출력됩니다.',
      ],
    },
  },

  {
    chapter: 9, index: 2, id: 'tab-sub',
    name: '서브탭 (tab-sub)',
    summary: '기본탭의 하위 단계 탭. 클래스 토큰 하나만 다릅니다. <b>모바일의 서브탭은 선택된 탭에 검정 밑줄</b>이 붙습니다 — 기본탭(파란 칩)과 정반대의 표현입니다.',
    capture: null,
    figmaNodeId: '(모바일 미확정 — 문서마다 다른 id가 적혀 있습니다. 컴포넌트 <code>Tab/Item</code> = 15382:2793)',

    build: {
      tree: `sub_group_tbcbox           (기본탭과 동일)
└ sub_tabcontrol_tbc_sub   ← 기본탭과 다른 곳은 여기 하나뿐
   ├ tabhost               탭 줄 높이 42 · padding 12 8 0 20 · 탭 사이 간격 52 · 좌측 정렬
   │  ├ subtab1_tabs       높이 30 · 아래 여백 12
   │  │  └ label           "탭버튼 첫번째"
   │  └ subtab2_tabs
   │     └ label           "탭버튼 두번째"
   └ sub_content_group     이름에 "content" 포함 → 탭 본문 (동일)`,
      points: [
        {
          t: '선택 탭은 <b>검정 밑줄</b>',
          d: '선택 탭 = 글자 16 Bold <code>#212B36</code> + 아래 <b>2px 검정 밑줄</b>, 비선택 탭 = 16 Regular <code>#637381</code> · 밑줄 없음입니다(375 렌더 실측). 배경 칩은 없습니다.',
        },
        {
          t: '<code>tbc</code>를 <code>tbc_sub</code>로 바꾸는 것이 전부',
          d: '탭 컨트롤 레이어 이름의 클래스 자리만 바꿉니다. 나머지 구조는 기본탭과 완전히 같습니다.',
        },
        {
          t: '탭 줄이 왼쪽으로 들어가 있습니다',
          d: '탭 줄 높이 42 · 왼쪽 여백 20 · 위 여백 12이고, <b>탭 사이 간격이 52</b>로 넓습니다. 좌측 정렬이라 오른쪽은 그냥 빈 공간입니다.',
        },
        {
          t: '탭 개수에는 제한이 없습니다',
          d: '두 개만 그려도 되고 더 많아도 됩니다. 넘치면 가로로 스크롤됩니다.',
        },
      ],
    },
    pitfalls: [
      '<b>클래스는 <code>tbc_sub</code> 전체를 씁니다.</b> <code>sub</code>만 쓰면 서브탭 CSS가 걸리지 않고 클래스 없는 탭이 됩니다.',
      '<b>밑줄과 구분선은 그리지 않습니다.</b> 탭 안에서 매핑되는 것은 라벨 텍스트뿐이고, 밑줄은 CSS가 그립니다.',
      '<b>기본탭을 복제해 서브탭을 만들 때는 클래스와 모양을 함께 바꿉니다.</b> 모바일에서 두 형태는 <b>칩 대 밑줄</b>로 확연히 다릅니다 — 클래스만 바꾸면 Figma와 화면이 어긋납니다.',
      '<b>PC 기준으로 만든 문서·감각을 그대로 옮기지 않습니다.</b> 「기본탭 = 밑줄, 서브탭 = 파란 글자」는 옛 모바일 규칙이며, 현재는 반대입니다.',
    ],
    limits: [
      '밑줄의 두께(2px)와 색은 CSS 고정값입니다.',
      '탭 사이 간격 52와 왼쪽 인셋 20도 CSS 고정값입니다. Figma에서 벌려 그려도 결과가 따라오지 않습니다.',
      '기본탭의 제약이 동일하게 적용됩니다 — 선택 상태·아이콘·배지·크기 미반영(9.1 참조).',
    ],
    xmlOut: {
      note: '<b>변환 결과 XML은 PC와 동일합니다.</b> 기본탭과의 차이는 <code>class</code> 값 하나뿐입니다.',
      code: `<xf:group class="tbcbox">
  <w2:tabControl class="tbc_sub">
    <w2:tabs id="tabs1" label="탭버튼 첫번째"></w2:tabs>
    <w2:tabs id="tabs2" label="탭버튼 두번째"></w2:tabs>
    <w2:content id="content1">
      <w2:textbox label="탭 컨텐츠 영역"></w2:textbox>
    </w2:content>
    <w2:content id="content2"></w2:content>
  </w2:tabControl>
</xf:group>`,
      points: [
        '<code>class="tbc"</code>가 <code>class="tbc_sub"</code>로 바뀐 것 외에는 기본탭과 구조가 동일합니다.',
        '변형 속성(<code>tabPosition</code>·<code>tabScroll</code>·<code>adaptive</code>)은 출력되지 않습니다. 상위 이름의 첫 조각이 <code>sub</code>이라 어느 변형에도 해당하지 않기 때문입니다.',
      ],
    },
  },

  {
    chapter: 9, index: 3, id: 'tab-scroll',
    name: '탭 스크롤 (tab-scroll)',
    summary: '탭이 많아 한 줄에 다 들어가지 않을 때 좌우로 스크롤하는 탭. 닫기(✕) 버튼도 함께 켜집니다. <b>모바일에서도 기본탭과 똑같은 파란 칩 모양</b>으로 그려집니다.',
    capture: null,
    figmaNodeId: '(모바일 미확정 — 대응 노드 id 미확인. 컴포넌트 <code>Tab/Item</code> = 15382:2793)',

    build: {
      tree: `scroll_group_tbcbox             ← 첫 조각을 "scroll"로 짓는 것이 전부입니다
└ sc_tabcontrol_tbc             (기본탭과 동일)
   ├ tabhost                    (동일)
   │  └ tab1_tabs … tab5_tabs   (기본탭과 동일하게 5개 · 칩 높이 42 · 좌우 여백 20 · 모서리 6)
   └ content_group              (동일)`,
      points: [
        {
          t: '상위 그룹 이름의 <b>첫 조각</b>을 <code>scroll</code>로',
          d: '<code>scroll_group_tbcbox</code>처럼 <code>tbcbox</code> 그룹의 첫 조각을 바꾸는 것이 전부입니다. 탭 컨트롤 레이어에 지정하면 적용되지 않습니다.',
        },
        {
          t: '모양은 기본탭과 같습니다',
          d: '모바일 CSS가 스크롤 탭도 <b>기본탭과 똑같이</b> 그리도록 맞춰 두었습니다 — 탭 줄 50 · 칩 42 · 좌우 여백 20 · 모서리 6 · 선택 시 파란 칩(375 렌더 실측). Figma도 기본탭과 같게 그립니다.',
        },
        {
          t: '스크롤 버튼은 오른쪽 끝에 붙습니다',
          d: '◀ ▶ ≡ 세 개가 32 × 32 · 모서리 4로 오른쪽에 붙어 그려집니다. <b>이 버튼들은 엔진과 CSS가 그리므로 Figma에 그리지 않습니다.</b>',
        },
        {
          t: '닫기 버튼이 함께 켜집니다',
          d: '스크롤과 닫기는 한 쌍으로 적용됩니다. ✕ 아이콘도 그리지 않습니다.',
        },
      ],
    },
    pitfalls: [
      '<b><code>scroll</code>은 상위 <code>tbcbox</code> 그룹의 첫 조각에 지정합니다.</b> 누락하면 기본탭으로 변환되며, <b>모바일에서는 두 항목의 모양이 같아 화면으로도 구분되지 않습니다.</b> 8장의 어댑티브 표와 같은 유형입니다.',
      '<b>닫기 버튼이 필요 없으면 스크롤 탭을 쓰지 않습니다.</b> 스크롤과 닫기의 조합은 바꿀 수 없습니다.',
      '<b>화살표·✕ 아이콘을 Figma에 그리지 않습니다.</b> 그려 두면 결과에 나가지 않으면서 캔버스만 어지럽힙니다.',
    ],
    limits: [
      '스크롤과 닫기를 따로 켜고 끌 수 없습니다.',
      '스크롤 화살표의 모양·위치와 스크롤 단위는 지정할 수 없습니다.',
      '<b>모바일에서는 스크롤 탭과 기본탭이 화면으로 구분되지 않습니다.</b> 검수는 결과 XML의 속성으로 합니다.',
      '기본탭의 제약이 동일하게 적용됩니다(9.1 참조).',
    ],
    xmlOut: {
      note: '<b>변환 결과 XML은 PC와 동일합니다.</b> 기본탭 결과에 속성 두 개가 더 붙은 형태입니다.',
      code: `<xf:group class="tbcbox">
  <w2:tabControl class="tbc" tabScroll="true" closable="true">
    <w2:tabs id="tabs1" label="탭1"></w2:tabs>
    …
    <w2:tabs id="tabs5" label="탭5"></w2:tabs>
    <w2:content id="content1">
      <w2:textbox label="탭 컨텐츠 영역"></w2:textbox>
    </w2:content>
    <w2:content id="content2"></w2:content>
    …
  </w2:tabControl>
</xf:group>`,
      points: [
        '<code>tabScroll="true"</code>와 <code>closable="true"</code>가 <b>함께</b> 출력됩니다.',
        '탭·본문 구조는 기본탭과 동일하며, 차이는 <code>tabControl</code> 태그의 속성 두 개입니다.',
      ],
    },
  },

  {
    chapter: 9, index: 4, id: 'tab-left',
    name: '탭(왼쪽) (tab-left)',
    summary: '탭 줄을 좌측에 세로로 두는 탭. 상위 이름의 첫 조각을 <code>left</code>로 지정합니다. <b>375에서는 세로 배치가 만들어지지 않고 위쪽 가로 탭 줄로 그려집니다</b> — 좁은 화면에 세로 탭 열을 둘 자리가 없기 때문입니다.',
    capture: null,
    figmaNodeId: '(모바일 미확정 — 대응 노드 id 미확인. 컴포넌트 <code>Tab/Item</code> = 15382:2793)',

    build: {
      tree: `left_group_tbcbox               ← 첫 조각 "left"가 탭 위치를 정합니다
└ lf_tabcontrol_tbc
   ├ tabhost                    ★ 반드시 있어야 합니다 — 없으면 어댑티브로 넘어가 위치가 무시됩니다
   │  └ tab1_tabs … tab5_tabs
   └ content_group              탭 본문`,
      points: [
        {
          t: '첫 조각 <code>left</code>가 위치를 결정',
          d: '<code>tbcbox</code> 그룹 이름의 첫 조각에 지정합니다. 탭 컨트롤 레이어 이름에 지정하면 적용되지 않습니다.',
        },
        {
          t: '<b>375에서는 위쪽 가로 탭으로 그려집니다</b>',
          d: '375 렌더 실측 결과, 탭 줄이 <b>화면 맨 위(y=0)에 가로</b>로 놓이고 본문이 그 아래에 옵니다. 모양은 기본탭과 같은 파란 칩입니다. 모바일 CSS가 <b>세로 탭을 상단 가로 탭으로 되돌리는 전용 규칙</b>을 갖고 있습니다 — 세로 탭으로 두면 탭 열이 62px로 서고 본문이 잘려 사라지기 때문입니다. <b>Figma에도 그 결과대로 위쪽 가로 탭으로 그립니다.</b>',
        },
        {
          t: '<code>tabhost</code>가 없으면 위치가 적용되지 않습니다',
          d: '<code>tabhost</code>를 지우면 어댑티브 판정이 위치보다 먼저 걸려 <code>tabPosition</code>이 아예 출력되지 않습니다. <b>9장에서 가장 자주 나는 오류입니다.</b>',
        },
      ],
    },
    pitfalls: [
      '<b><code>tabhost</code>를 유지합니다.</b> 지우면 <code>tabPosition</code>이 출력되지 않습니다.',
      '<b>Figma에 세로 탭 열을 그리지 않습니다.</b> 결과 화면이 위쪽 가로 탭이므로, 세로로 그려 두면 캡처와 실제가 어긋나 검수에 혼선이 생깁니다.',
      '<b><code>top</code>·<code>up</code> 같은 값은 인식되지 않습니다.</b> 상단 탭은 값을 지정하지 않는 것이 기본입니다.',
      '<b>모바일 화면만으로는 기본탭과 구분되지 않습니다.</b> 검수는 결과 XML의 <code>tabPosition</code>으로 합니다.',
    ],
    limits: [
      '위치는 <code>left</code>·<code>right</code>·<code>bottom</code> 세 가지로 한정됩니다.',
      '<b>375에서 좌측 세로 배치는 표현되지 않습니다.</b> 속성은 결과 XML에 남지만 모바일 화면에는 반영되지 않습니다.',
      '기본탭의 제약이 동일하게 적용됩니다(9.1 참조).',
    ],
    xmlOut: {
      note: '<b>변환 결과 XML은 PC와 동일합니다.</b> 기본탭 결과에 <code>tabPosition</code>이 붙은 형태입니다.',
      code: `<xf:group class="tbcbox">
  <w2:tabControl class="tbc" tabPosition="left">
    <w2:tabs id="tabs1" label="탭1"></w2:tabs>
    …
    <w2:tabs id="tabs5" label="탭5"></w2:tabs>
    <w2:content id="content1">
      <w2:textbox label="탭 컨텐츠 영역"></w2:textbox>
    </w2:content>
    …
  </w2:tabControl>
</xf:group>`,
      points: [
        '<code>tabPosition="left"</code>만 추가되며 탭·본문 구조는 기본탭과 동일합니다.',
        '<code>adaptive</code> 속성이 없다는 것은 <code>tabhost</code>가 정상 적용되었다는 뜻입니다. 두 속성은 함께 출력되지 않습니다.',
        '<b>이 속성은 모바일 화면에 나타나지 않습니다.</b> PC로 볼 때를 위한 값입니다.',
      ],
    },
  },

  {
    chapter: 9, index: 5, id: 'tab-right',
    name: '탭(오른쪽) (tab-right)',
    summary: '탭 줄을 우측에 세로로 두는 탭. <code>left</code>와 규칙이 같고 레이어 순서만 반대입니다. <b>375에서는 <code>left</code>와 마찬가지로 위쪽 가로 탭 줄로 그려집니다.</b>',
    capture: null,
    figmaNodeId: '(모바일 미확정 — 대응 노드 id 미확인. 컴포넌트 <code>Tab/Item</code> = 15382:2793)',

    build: {
      tree: `right_group_tbcbox   ← 첫 조각 "right"
└ rt_tabcontrol_tbc
   ├ content_group   ← PC에서는 본문을 먼저 두었습니다(왼쪽에 보이므로)
   └ tabhost         ★ 필수 — 탭 줄을 나중에 두어 오른쪽에 보이게 합니다
      └ tab1_tabs … tab5_tabs`,
      points: [
        {
          t: '규칙은 <code>left</code>와 동일',
          d: '첫 조각만 <code>right</code>로 바꿉니다. <code>tabhost</code>가 필수인 것도 같습니다.',
        },
        {
          t: '<b>375에서는 위쪽 가로 탭으로 그려집니다</b>',
          d: '375 렌더 실측 결과, <code>left</code>와 동일하게 <b>탭 줄이 맨 위(y=0)</b>에 오고 본문이 그 아래에 옵니다. 우측 세로 배치는 만들어지지 않습니다 — <code>left</code>와 같은 CSS 규칙이 두 방향을 함께 상단 가로 탭으로 되돌립니다.',
        },
        {
          t: '레이어 순서는 PC 기준을 따릅니다',
          d: 'PC에서 본문을 먼저, 탭 줄을 나중에 두는 순서는 그대로 유지합니다. 모바일 화면에는 순서가 드러나지 않지만 결과 XML은 두 화면이 같아야 합니다.',
        },
      ],
    },
    pitfalls: [
      '<b><code>tabhost</code>를 유지합니다.</b> 지우면 <code>tabPosition</code>이 출력되지 않습니다(<code>left</code>와 동일).',
      '<b>Figma에서 본문과 탭 영역의 순서를 바꿔 위치를 조정할 수 없습니다.</b> 위치는 상위 이름의 첫 조각이 결정합니다.',
      '<b>모바일에서 우측 세로 탭을 그리지 않습니다.</b> 결과가 위쪽 가로 탭이므로 그대로 그려야 캡처와 화면이 맞습니다.',
    ],
    limits: [
      '<b>375에서 우측 세로 배치는 표현되지 않습니다.</b> 속성은 결과 XML에 남지만 모바일 화면에는 반영되지 않습니다.',
      '세로 탭의 폭은 PC에서만 의미가 있는 CSS 고정값입니다.',
      '기본탭의 제약이 동일하게 적용됩니다(9.1 참조).',
    ],
    xmlOut: {
      note: '<b>변환 결과 XML은 PC와 동일합니다.</b> Figma에서는 본문을 먼저 배치했으나 결과에서는 탭이 먼저 출력됩니다.',
      code: `<xf:group class="tbcbox">
  <w2:tabControl class="tbc" tabPosition="right">
    <w2:tabs id="tabs1" label="탭1"></w2:tabs>
    …
    <w2:tabs id="tabs5" label="탭5"></w2:tabs>
    <w2:content id="content1">
      <w2:textbox label="탭 컨텐츠 영역"></w2:textbox>
    </w2:content>
    …
  </w2:tabControl>
</xf:group>`,
      points: [
        '<code>tabPosition="right"</code> 외에는 <code>left</code>와 결과가 동일합니다.',
        '<b>Figma 레이어 순서(본문 → 탭)와 결과 순서(탭 → 본문)가 다릅니다.</b> 탭 컨트롤 안에서는 4장의 레이어 순서 규칙이 적용되지 않고, 변환기가 탭과 본문을 각각 모아 정해진 순서로 구성합니다.',
      ],
    },
  },

  {
    chapter: 9, index: 6, id: 'tab-bottom',
    name: '탭(아래쪽) (tab-bottom)',
    summary: '탭 줄을 본문 아래에 가로로 두는 탭. 첫 조각을 <code>bottom</code>으로 지정합니다. <b>9장의 세 위치 변형 중 375에서 실제로 자리가 바뀌는 유일한 항목입니다</b> — 탭 줄이 본문 아래에 그려집니다.',
    capture: null,
    figmaNodeId: '(모바일 미확정 — 대응 노드 id 미확인. 컴포넌트 <code>Tab/Item</code> = 15382:2793)',

    build: {
      tree: `bottom_group_tbcbox             ← 첫 조각 "bottom"
└ bm_tabcontrol_tbc
   ├ content_group              ← 본문을 먼저(위에 보이므로)
   └ tabhost                    ★ 필수 — 탭 줄을 나중에(아래에 보이게)
      └ tab1_tabs … tab5_tabs   가로로 나란히 · 칩 높이 42 · 모서리 6`,
      points: [
        {
          t: '첫 조각을 <code>bottom</code>으로 지정',
          d: '<code>tbcbox</code> 그룹 이름의 첫 조각에 씁니다. <code>under</code>·<code>down</code>은 인식되지 않습니다.',
        },
        {
          t: '<b>375에서도 탭 줄이 아래에 그려집니다</b>',
          d: '375 렌더 실측 결과 본문이 위(y=0), 탭 줄이 아래에 놓입니다. <code>left</code>·<code>right</code>와 달리 <b>이 위치는 모바일에서도 그대로 반영됩니다.</b> 탭 줄의 높이·모양은 기본탭과 같습니다.',
        },
        {
          t: '레이어 순서는 본문 → 탭',
          d: '보이는 순서대로 본문을 먼저, 탭 줄을 나중에 둡니다. <code>right</code>와 같은 방식입니다.',
        },
      ],
    },
    pitfalls: [
      '<b><code>tabhost</code>를 유지합니다.</b> 지우면 <code>tabPosition</code>이 출력되지 않습니다.',
      '<b>본문을 아래에 배치하는 것만으로는 하단 탭이 되지 않습니다.</b> 이름의 첫 조각이 <code>bottom</code>이어야 합니다.',
      '<b><code>under</code>·<code>down</code>은 인식되지 않습니다.</b> 값은 <code>bottom</code>입니다.',
    ],
    limits: [
      '탭 영역과 본문 사이의 간격·구분선은 CSS 고정값입니다.',
      '탭 줄의 높이·정렬·칩 모양도 기본탭과 같은 CSS 고정값입니다.',
      '기본탭의 제약이 동일하게 적용됩니다(9.1 참조).',
    ],
    xmlOut: {
      note: '<b>변환 결과 XML은 PC와 동일합니다.</b>',
      code: `<xf:group class="tbcbox">
  <w2:tabControl class="tbc" tabPosition="bottom">
    <w2:tabs id="tabs1" label="탭1"></w2:tabs>
    …
    <w2:tabs id="tabs5" label="탭5"></w2:tabs>
    <w2:content id="content1">
      <w2:textbox label="탭 컨텐츠 영역"></w2:textbox>
    </w2:content>
    …
  </w2:tabControl>
</xf:group>`,
      points: [
        '<code>tabPosition="bottom"</code> 외에는 기본탭과 결과가 동일합니다.',
        '결과는 탭이 먼저, 본문이 나중에 출력되며 Figma 레이어 순서와 반대입니다.',
      ],
    },
  },

  {
    chapter: 9, index: 7, id: 'tab-adaptive',
    name: '탭(어댑티브 · 아코디언) (tab-adaptive)',
    summary: '좁은 화면에서 탭이 아코디언으로 바뀌는 탭. 9장에서 <b>이 항목만 구조가 다르며 <code>tabhost</code>를 쓰지 않습니다.</b> 기준 폭이 1920이라 <b>375에서는 언제나 아코디언으로 펼쳐집니다</b> — 탭 줄이 사라지고 본문이 세로로 이어집니다.',
    capture: null,
    figmaNodeId: '(모바일 미확정 — 대응 노드 id 미확인. 컴포넌트 <code>Tab/Item</code> = 15382:2793)',

    build: {
      tree: `adaptive_group_tbcbox          ← 첫 조각 "adaptive"
└ adaptive_tabcontrol_tbc
   ├ atab1_tabs                ★ tabhost 없이 탭 컨트롤 바로 아래 둡니다
   │  ├ label                  "탭1" ← 라벨
   │  └ chevron                (장식 — 매핑 안 됨, 화살표는 CSS가 그립니다)
   ├ acontent1_group           탭 본문 1개만 그립니다
   │  └ content_textbox        "탭 컨텐츠 영역"
   └ atab2_tabs … atab5_tabs   (본문 없이 탭만 4개 더)`,
      points: [
        {
          t: '<b><code>tabhost</code>를 쓰지 않는 것이 핵심</b>',
          d: '탭을 탭 컨트롤 <b>직속</b>에 둡니다. <code>tabhost</code>가 있으면 어댑티브로 판정되지 않습니다(첫 조각이 <code>adaptive</code>인 경우는 예외).',
        },
        {
          t: '375에서는 항상 아코디언입니다',
          d: '기준 폭이 1920이고 모바일은 375이므로 <b>조건이 언제나 참</b>입니다. 375 렌더 실측에서도 탭 줄이 감춰지고 본문이 이어져 나옵니다. <b>Figma에도 아코디언으로 펼쳐진 모습으로 그립니다.</b>',
        },
        {
          t: '본문은 하나만 그려도 됩니다',
          d: '본문 <code>&lt;w2:content&gt;</code>는 탭 개수만큼 복제되어 나갑니다. 탭마다 내용이 달라야 하면 각각 그려야 합니다.',
        },
        {
          t: '위치 변형과는 함께 쓸 수 없습니다',
          d: '어댑티브와 <code>left</code>·<code>right</code>·<code>bottom</code>은 병용할 수 없습니다. 스크롤과는 함께 쓸 수 있습니다.',
        },
      ],
    },
    pitfalls: [
      '<b>위치 변형에는 <code>tabhost</code>를 두고 어댑티브에는 두지 않습니다.</b> 위치 변형에서 <code>tabhost</code>가 빠지면 어댑티브로 판정되고, 어댑티브에 <code>tabhost</code>가 있으면 어댑티브로 판정되지 않습니다. 두 구조는 서로 바꿔 쓸 수 없습니다.',
      '<b>모바일에서는 이 항목만 다른 탭들과 화면이 확연히 다릅니다.</b> 다른 여섯 항목은 모두 탭 줄이 보이지만 이 항목은 탭 줄이 없습니다 — 반대로 말하면, 탭 줄이 안 보이면 <code>tabhost</code>가 빠진 것입니다.',
      '<b>본문 개수는 탭 개수와 맞춥니다.</b> 본문이 부족하면 첫 번째 본문이 복제되어, 빈 상태가 아니라 의도와 다른 내용으로 채워집니다.',
      '<b>화살표는 결과에 나가지 않지만 Figma에는 그립니다.</b> 아코디언 화살표는 CSS가 그립니다.',
    ],
    limits: [
      '기준 폭(1920)은 바꿀 수 없습니다.',
      '어댑티브와 탭 위치(<code>left</code>·<code>right</code>·<code>bottom</code>)는 함께 쓸 수 없습니다.',
      '펼침 상태의 항목과 여러 개를 동시에 펼칠 수 있는지 여부는 지정할 수 없습니다.',
      '기본탭의 제약이 동일하게 적용됩니다(9.1 참조).',
    ],
    xmlOut: {
      note: '<b>변환 결과 XML은 PC와 동일합니다.</b> 탭 5개·본문 1개를 그리면 <code>&lt;w2:content&gt;</code> 5개가 <b>같은 내용으로</b> 출력됩니다.',
      code: `<xf:group class="tbcbox">
  <w2:tabControl class="tbc" adaptive="layout" adaptiveThreshold="1920">
    <w2:tabs id="tabs1" label="탭1"></w2:tabs>
    …
    <w2:tabs id="tabs5" label="탭5"></w2:tabs>
    <w2:content id="content1">
      <w2:textbox label="탭 컨텐츠 영역"></w2:textbox>
    </w2:content>
    <w2:content id="content2">
      <w2:textbox label="탭 컨텐츠 영역"></w2:textbox>
    </w2:content>
    …  (content3·4·5도 같은 내용)
  </w2:tabControl>
</xf:group>`,
      points: [
        '<code>adaptive="layout"</code>과 <code>adaptiveThreshold="1920"</code>이 함께 출력됩니다.',
        '<b><code>tabPosition</code>이 출력되지 않습니다.</b> 어댑티브와 함께 나올 수 없습니다.',
        '본문 5개가 모두 같은 내용입니다. 본문을 하나만 그려도 되는 근거이자, <b>탭마다 다른 내용이 필요하면 각각 그려야 하는 근거</b>이기도 합니다.',
      ],
    },
  },

  /* ===================== 10장. 입출력 테이블 ===================== */

  {
    chapter: 10, index: 1, id: 'tblbox',
    name: '입출력 테이블 (tblbox)',
    summary: '라벨과 값을 짝지어 보여주거나 입력받는 표. <b>모바일에서는 조회영역과 마찬가지로 라벨이 값 위로 올라가는 세로 스택</b>이며, 조회영역과 달리 <code>schbox_inner</code>가 없고 카드 안쪽 폭 335를 씁니다.',
    capture: null,
    figmaNodeId: '(모바일 미확정 — 문서마다 다른 id가 적혀 있습니다. 후보 = io_group_tblbox 15384:21944)',

    build: {
      tree: `io_group_tblbox                   335 · 배경 흰색 · 모서리 8   ← 조회영역과 달리 inner 그룹이 없습니다
└ io_table_tbl                    가로FILL
   ├ row_tr_w2tb_tr               세로 · 가로FILL          ← 라벨셀과 값셀이 세로로 쌓입니다
   │  ├ head_th                   335 × 24  (라벨 줄)
   │  │  ├ star                   (장식 — 매핑 안 됨)
   │  │  └ head_textbox           "테이블헤더"
   │  ├ field_td                  335 · gap 8 (값 줄)
   │  │  ├ keyword_input
   │  │  └ cond_select
   │  ├ head_th                   335 × 24
   │  └ field_td
   │     └ link_anchor            "Insert Text" — 링크도 값셀에 넣을 수 있습니다
   └ row_tr_w2tb_tr               (2번째 행 — 행 사이 간격 20)`,
      points: [
        {
          t: '표 작성 규칙은 8장 조회영역과 동일',
          d: '행 이름은 <code>row_tr_w2tb_tr</code>, 라벨셀·값셀은 <code>head_th</code>·<code>field_td</code>처럼 접두어를 붙입니다. <b>차이는 바깥 컨테이너뿐</b>입니다.',
        },
        {
          t: '조회영역과 달리 <code>schbox_inner</code>가 없습니다',
          d: '<code>tblbox</code> 바로 아래에 표가 옵니다. 조회영역 구조를 복제해 만들 때 이 그룹이 함께 딸려오는 일이 잦습니다.',
        },
        {
          t: '폭은 335 — 화면 끝까지 늘어나지 않습니다',
          d: '<code>tblbox</code>는 카드 안쪽에 들어가는 블록이라 <b>335</b>입니다(조회영역·페이지 타이틀은 375). 배경은 흰색, 모서리는 8입니다.',
        },
        {
          t: '값셀에는 폼 필드 외에 링크·텍스트도 넣을 수 있습니다',
          d: '<code>link_anchor</code>처럼 앵커를 넣어도 되고 그냥 텍스트를 넣어도 됩니다. 필드는 모바일 규격대로 높이 48 · 모서리 8 · 글자 16입니다.',
        },
        {
          t: '라벨셀 폭은 모바일 화면에 나타나지 않습니다',
          d: '세로 스택이라 열 폭이라는 개념이 없습니다. 다만 폭 값은 결과 XML의 <code>colgroup</code>에 그대로 실리므로, PC로도 볼 화면이면 템플릿 기준 150px에 맞춰 둡니다.',
        },
      ],
    },
    pitfalls: [
      '<b>입출력 테이블에 <code>schbox_inner</code>를 쓰지 않습니다.</b> 조회영역을 복제할 때 함께 들어오기 쉬우며, 남아 있으면 결과에 불필요한 그룹이 추가됩니다.',
      '<b>모든 행에 <code>w2tb_tr</code>을 붙입니다.</b> 빠지면 라벨과 값이 각각 줄바꿈되어 짝이 깨집니다.',
      '<b>같은 열의 라벨셀은 모든 행에서 폭을 통일합니다.</b> 열 폭 기준 행은 변환기가 자동으로 고르므로, 행마다 폭이 다르면 어떤 값이 실릴지 예측할 수 없습니다.',
      '<b>열 폭은 라벨셀(th)에서 조정합니다.</b> 값셀(td)을 조정해도 열 폭은 바뀌지 않습니다.',
      '<b>화면에 그려지는 라벨 글자 크기가 정본과 다릅니다.</b> 참고 디자인 실측은 14 <code>#637381</code>인데 현재 CSS의 「모든 <code>textbox</code>는 16」 규칙 때문에 <b>화면에는 16</b>으로 나옵니다(375 렌더 실측).',
    ],
    limits: [
      '표의 폭은 항상 <code>width:100%</code>로 고정됩니다.',
      '셀 병합은 변환기가 속성으로 만들지만, 병합 대상과 범위는 Figma 레이어 구조로 표현해야 합니다. 셀을 시각적으로 넓게 그리는 것만으로는 병합이 적용되지 않습니다.',
      '한 값셀 안에서 필드가 몇 개씩 한 줄에 들어갈지는 CSS가 정합니다.',
    ],
    xmlOut: {
      note: '<b>변환 결과 XML은 PC와 동일합니다.</b> 변환기가 자동으로 만드는 블록(<code>w2:attributes</code> · <code>colgroup</code> · <code>scope</code>)을 <b>생략하지 않고</b> 표기했습니다 — 그릴 대상이 아닌 항목을 확인하는 용도입니다.',
      code: `<xf:group class="tblbox">
  <xf:group tagname="table" class="w2tb tbl" style="width:100%;">

    <w2:attributes>
      <w2:summary></w2:summary>
    </w2:attributes>

    <xf:group tagname="colgroup">
      <xf:group tagname="col" style="width:150px"></xf:group>   ← 라벨셀의 잰 폭
      <xf:group tagname="col" style=""></xf:group>              ← 값셀은 비어 있음
      <xf:group tagname="col" style="width:150px"></xf:group>
      <xf:group tagname="col" style=""></xf:group>
    </xf:group>

    <xf:group tagname="tr" class="w2tb_tr">
      <xf:group tagname="th" class="w2tb_th">
        <w2:attributes><w2:scope>row</w2:scope></w2:attributes>
        <w2:textbox label="테이블헤더"></w2:textbox>
      </xf:group>
      <xf:group tagname="td" class="w2tb_td">
        <xf:input placeholder="입력하세요" style="width:120px;"></xf:input>
        <xf:select1 appearance="minimal" style="width:100%;"> … </xf:select1>
      </xf:group>
      <xf:group tagname="th" class="w2tb_th"> … </xf:group>
      <xf:group tagname="td" class="w2tb_td">
        <w2:anchor label="Insert Text"></w2:anchor>
      </xf:group>
    </xf:group>

    <xf:group tagname="tr" class="w2tb_tr"> … </xf:group>

  </xf:group>
</xf:group>`,
      points: [
        '<code>&lt;colgroup&gt;</code>의 폭은 라벨셀의 Figma 측정 폭에서 나옵니다. <b>모바일 화면은 이 값을 쓰지 않지만 XML에는 남습니다.</b>',
        '<code>&lt;w2:attributes&gt;</code>와 <code>scope</code>는 변환기가 자동으로 붙입니다 — 그릴 대상이 아닙니다.',
        '값셀 안의 인라인 <code>style="width:…"</code>도 모바일 화면에는 반영되지 않습니다. 필드는 CSS가 줄 폭에 맞춥니다.',
      ],
    },
  },

  {
    chapter: 10, index: 2, id: 'tblbox-adaptive',
    name: '입출력 테이블 — 어댑티브',
    summary: 'Figma 작성 내용은 10.1과 같고 표 이름에 <code>w2tb_adaptive_layout</code> 토큰 하나를 더합니다. <b>모바일에서는 이 토큰이 있든 없든 화면이 같습니다</b> — 모바일 CSS가 이미 모든 표를 세로로 쌓기 때문입니다.',
    capture: null,
    figmaNodeId: '(모바일 미확정 — 어댑티브 전용 노드 id 미확인. 기준 = 10.1과 같은 표)',

    build: {
      tree: `io_group_tblbox                       (10.1과 동일)
└ io_table_tbl w2tb_adaptive_layout   ← 다른 곳은 여기, 이름 끝의 이 토큰 하나뿐입니다
   ├ row_tr_w2tb_tr
   │  ├ head_th                       335 × 24
   │  │  ├ star                       (장식 — 매핑 안 됨)
   │  │  └ head_textbox_req           (필수 표시 — 모바일은 별표 *)
   │  ├ field_td
   │  │  └ keyword_input
   │  ├ head_th
   │  └ field_td
   │     └ link_anchor
   └ row_tr_w2tb_tr                   (2번째 행 — 위와 같은 구조)`,
      points: [
        {
          t: '표 레이어 이름 끝에 토큰 하나 추가',
          d: '<code>io_table_tbl</code>을 <code>io_table_tbl w2tb_adaptive_layout</code>으로 바꿉니다. <b>이 토큰은 자동으로 붙지 않습니다.</b>',
        },
        {
          t: '모바일에서는 화면 차이가 없습니다',
          d: '<code>base_mobile.css</code>는 <b>어댑티브 구분 없이 모든 표를 1열 세로 스택</b>으로 그립니다. PC에서 이 토큰이 만들던 「라벨 150px + 값 1열」 배치가 모바일에는 없습니다.',
        },
        {
          t: '한 행에는 라벨·값 한 쌍씩',
          d: '어댑티브에서는 두 쌍을 넣어도 한 쌍씩 분리됩니다. <b>모바일은 어댑티브가 아니어도 한 쌍씩 분리되므로</b> 처음부터 한 쌍씩 그리는 편이 결과와 맞습니다.',
        },
        {
          t: '필수 표시는 별표 <code>*</code>',
          d: '라벨 텍스트에 <code>req</code> 클래스를 지정합니다. PC는 파란 점 ●이지만 <b>모바일은 라벨 앞 별표</b>입니다.',
        },
      ],
    },
    pitfalls: [
      '<b>검수는 캔버스가 아니라 결과 XML에서 합니다.</b> 두 항목은 Figma에서도 모바일 화면에서도 구분되지 않습니다. 클래스가 빠져도 변환은 오류 없이 끝나고 경고도 없습니다.',
      '<b>모바일에서 확인이 안 된다고 토큰을 빼지 않습니다.</b> 같은 XML을 PC로 볼 때 배치가 달라집니다.',
      '<b>어댑티브를 쓰는 표에서는 라벨셀 폭을 맞출 필요가 없습니다.</b> PC에서 라벨열이 150px로 고정되고, 모바일에서는 애초에 열 폭을 쓰지 않습니다.',
      '<b>토큰은 표 레이어에만 지정합니다.</b> <code>tblbox</code> 그룹이나 행·셀에 지정하면 적용되지 않습니다.',
    ],
    limits: [
      '<b>모바일 화면에서는 어댑티브 적용 여부를 확인할 수 없습니다.</b> 모든 표가 이미 세로 스택이라 차이가 나타나지 않습니다.',
      '라벨열 폭(PC 기준 150px)은 바꿀 수 없습니다. 어댑티브 CSS가 <code>colgroup</code>보다 먼저 적용됩니다.',
      'tblbox의 제약이 동일하게 적용됩니다 — 표 폭 100% 고정, 값셀 폭 미반영(10.1 참조).',
    ],
    xmlOut: {
      note: '<b>변환 결과 XML은 PC와 동일합니다.</b> 10.1의 XML과는 표 태그 한 줄만 다릅니다.',
      code: `<xf:group class="tblbox">
  <xf:group tagname="table" class="w2tb tbl w2tb_adaptive_layout" style="width:100%;">

    <xf:group tagname="colgroup"> … </xf:group>   ← 만들어지지만 어댑티브 CSS가 무시합니다

    <xf:group tagname="tr" class="w2tb_tr">
      <xf:group tagname="th" class="w2tb_th">
        <w2:attributes><w2:scope>row</w2:scope></w2:attributes>
        <w2:textbox class="req" label="테이블헤더"></w2:textbox>
      </xf:group>
      <xf:group tagname="td" class="w2tb_td">
        <xf:input placeholder="입력하세요" style="width:100%;"></xf:input>
      </xf:group>
      <xf:group tagname="th" class="w2tb_th"> … </xf:group>
      <xf:group tagname="td" class="w2tb_td"> … </xf:group>
    </xf:group>

    <xf:group tagname="tr" class="w2tb_tr"> … </xf:group>

  </xf:group>
</xf:group>`,
      points: [
        '바뀌는 것은 표의 <code>class</code> 속성 하나입니다 — <code>w2tb tbl</code> → <code>w2tb tbl w2tb_adaptive_layout</code>.',
        '<code>&lt;colgroup&gt;</code>은 그대로 만들어지지만 어댑티브에서는 쓰이지 않습니다. <b>모바일에서는 어느 쪽이든 쓰이지 않습니다.</b>',
        '필수 표시는 라벨 텍스트의 <code>class="req"</code>로 나갑니다. 별표를 그린 레이어가 나가는 것이 아닙니다.',
      ],
    },
  },

  /* ===================== 11장. 그리드 ===================== */

  {
    chapter: 11, index: 1, id: 'grid',
    name: '그리드 (grid)',
    summary: '다량의 데이터를 행과 열로 보여주는 컴포넌트. <b>모바일에서도 세로로 쌓지 않고 가로 표 그대로 유지</b>하며, 화면보다 넓어지는 만큼은 가로 스크롤로 받습니다.',
    capture: null,
    figmaNodeId: '15537:5644 (template_Mobile · x6 gvwbox+pglbox)',

    build: {
      tree: `grid_group_gvwbox            375 풀블리드 · padding 0 20 · 배경 흰색
└ grid_gridview_gvw          폭 = 컬럼수 × 90   ← 셀이 FILL이라 이 값 하나면 각 셀이 90이 됩니다
   ├ header_row              ★ 이름에 "header" → 헤더 행. 이 행의 셀 개수가 컬럼 개수입니다
   │  ├ cell                 90 × 42 · 배경 #F9FAFB
   │  │  └ label             "타이틀" ← 컬럼 제목이 됩니다
   │  └ cell × 5             (같은 구조로 6개 = 컬럼 6개)
   ├ body_row                ★ 이름에 "row" → 데이터 행
   │  └ cell × 6             90 × 42 · 배경 #FFFFFF · 셀의 첫 텍스트가 데이터가 됩니다
   └ body_row × 4            (데이터 행은 몇 개든 그려도 됩니다)`,
      points: [
        {
          t: '컬럼은 헤더 행이 결정 — 규칙은 PC와 같습니다',
          d: '하위 항목 중 <b>이름에 <code>header</code>가 포함된 첫 프레임</b>이 헤더 행이 되고(없으면 첫 번째 하위 항목), <b>그 행의 셀 개수가 컬럼 개수</b>가 됩니다. 셀 안 첫 텍스트가 컬럼 제목입니다. <b>이름 규칙은 모바일에서도 하나도 달라지지 않습니다.</b>',
        },
        {
          t: '데이터 행 이름에는 <code>row</code>가 들어가야 합니다',
          d: '<code>body_row</code>처럼 <b>이름에 <code>row</code>가 있고 <code>header</code>·<code>footer</code>는 없는</b> 하위 항목만 데이터 행으로 읽습니다. <code>line1</code>·<code>data2</code>로 지으면 <b>그 행이 통째로 빠집니다.</b>',
        },
        {
          t: '<b>모바일에서도 가로 표입니다 — 세로로 쌓이지 않습니다</b>',
          d: '입출력 테이블(10장)은 모바일에서 세로 스택이 되지만 <b>그리드는 가로 그대로</b>입니다. 바깥 <code>gvwbox</code>는 <b>375 풀블리드 + 좌우 padding 20</b>이라 그리드가 좌 20에서 시작해 다른 블록과 줄이 맞고, 콘텐츠 폭(335)을 넘는 만큼이 <b>가로 스크롤</b>이 됩니다(끝까지 밀어도 우측 20은 남습니다). <b>이 가로 스크롤은 버그가 아니라 정본입니다</b> — 한 번 「열 균등분할로 없애기」를 시도했다가 5열 그리드가 열당 63px이 되어 글자가 잘려 원복한 이력이 있습니다.',
        },
        {
          t: 'Figma에서 폭은 <code>gridview</code> 하나에만 줍니다',
          d: '컬럼 폭은 <b>90 고정</b>이고, <b><code>gridview</code> 폭 = 컬럼수 × 90</b>만 지정하면 셀이 FILL이라 각 90으로 자동 분배됩니다. <b>셀마다 폭을 지정하지 마세요</b> — 9컬럼이면 87번 손대야 하는 일이 됩니다.',
        },
        {
          t: '행 높이 <b>42</b> · 색과 보더 모델',
          d: '행 높이는 <b>42</b>입니다(<code>base_mobile.css</code>의 <code>--wsm-row-h</code>. 디자인 템플릿 재실측으로 헤더·바디·셀이 모두 42, 글자 16 상향과 함께 커졌습니다). 헤더 셀은 배경 <code>#F9FAFB</code> · 글자 <b>16 Medium</b> <code>#212B36</code> · 선 <code>#C4CDD5</code>, 바디 셀은 배경 <code>#FFFFFF</code> · 글자 <b>16 Medium</b> <code>#454F5B</code> · 선 <code>#EAEEF1</code> <b>실선</b>입니다(PC는 <code>#C4CDD5</code> 점선). 보더는 <b>셀 = 우측선만 · 행 = 하단선만</b>이고 <b>각 행의 마지막 셀만 선이 없습니다</b>(바깥 테두리는 <code>gvwbox</code> 담당).',
        },
        {
          t: '화면에 실제로 나오는 열 폭은 CSS가 <b>4단계</b>로 다시 정합니다',
          d: 'Figma의 90은 <b>Figma 안에서의 기준</b>이고, 브라우저에 그려질 때 열 폭은 모바일 CSS가 네 단계로 다시 정합니다 — <b>S 44 · M 88 · L 152 · FILL</b>. 판정 기준은 <b>본문 내용 + 헤더 라벨 유무</b>입니다. <b>선택 열</b>(헤더 칸에 체크박스가 직접 들어 있고 라벨이 없음)은 <b>S(44)</b>, <b>데이터 열</b>(헤더 칸에 라벨이 있음)은 <b>L(152)</b>입니다. 즉 <b>S·M은 라벨 없는 열(선택·아이콘) 전용</b>이고 <b>이름이 붙으면 L로 올라갑니다.</b> M(88)은 버튼·링크·아이콘만 든 열이고, FILL은 <b>열 합계가 컨테이너보다 좁을 때만</b> 남는 폭을 열들이 나눠 갖는 동작입니다. 행번호 <code>No</code>는 별도 규칙으로 잡혀 <b>44를 유지</b>합니다(열 최소 폭을 36으로 벌려 둡니다 — 11.2 참조).',
        },
      ],
    },
    pitfalls: [
      '<b>헤더 행 이름에는 <code>header</code>를 넣습니다.</b> 빠지면 첫 번째 하위 항목이 헤더가 되어 맨 위 데이터 행이 컬럼 제목으로 올라가고 데이터에서 빠집니다.',
      '<b>데이터 행 이름에는 <code>row</code>를 넣습니다.</b> 빠진 행은 <b>오류도 경고도 없이</b> 결과에서 사라집니다. 데이터가 비어 보이면 여기부터 봅니다.',
      '<b>헤더 셀과 데이터 셀 개수를 맞춥니다.</b> 컬럼 수는 헤더가 정하므로 데이터 셀이 많으면 넘치는 만큼 잘리고, 적으면 빈 셀이 됩니다.',
      '<b>셀마다 폭을 지정하지 않습니다.</b> <code>gridview</code> 폭 하나로 끝내는 것이 정본이고, 셀 폭은 어차피 결과에 실리지 않습니다.',
      '<b>헤더 글자는 한 줄 유지가 정본입니다.</b> 잘린다고 줄바꿈으로 풀지 않습니다 — 44px 칸에서 글자가 한 자씩 세로로 쪼개져 폐기된 방식입니다. 폭(4단계)으로 푸는 것이 현행입니다.',
      '<b>행 높이와 셀 글자 크기는 정본 문서와 CSS가 어긋나 있습니다.</b> 모바일 사양문서 §5-7에는 <b>행 높이 36 · 셀 글자 14 Medium</b>으로 적혀 있으나, <b>2026-08-05에 디자인 템플릿을 다시 재면서 둘이 함께 갱신됐습니다</b> — <code>base_mobile.css</code>는 <b>행 높이 42 · 셀 글자 16 Medium</b>(헤더셀 <code>I15537:5897;15382:2908</code> · 바디셀 <code>I15537:5901;15382:2901</code> 모두 16/500)을 씁니다. <b>화면에 그려지는 값은 42 / 16</b>이므로 이 가이드는 그쪽을 기준으로 적었습니다.',
    ],
    limits: [
      '컬럼 폭(<code>width="70"</code>)과 그리드 높이는 변환기가 정하며 Figma에서 지정할 수 없습니다.',
      '<b>Figma에서 그린 90도 결과 화면에는 그대로 나오지 않습니다.</b> 화면 열 폭은 위 4단계 CSS가 정합니다.',
      '캡션 문구는 바꿀 수 없습니다.',
      '컬럼 정렬(가운데·오른쪽), 컬럼 고정, 행 높이는 지정할 수 없습니다.',
      '<b>열 이름이 아주 길면 L(152)에서도 잘립니다.</b> 실무 화면(3~5열)에서는 문제가 없다고 보아 그대로 두기로 한 사항입니다.',
    ],
    xmlOut: {
      note: '<b>변환 결과 XML은 PC와 동일합니다.</b> 컬럼이 6개라 반복 부분은 <code>…</code>로 줄였고, 데이터 목록(<code>w2:dataList</code>)은 그리드 밖 별도 블록이라 생략했습니다.',
      code: `<xf:group class="gvwbox">
  <w2:gridView style="height:153px;" autoFit="allColumn" class="gvw"
               dataList="data:gridData_…">
    <w2:caption id="caption1" style="" value="this is a grid caption."></w2:caption>

    <w2:header id="" style="">
      <w2:row>
        <w2:column id="column0" width="70" displayMode="label" value="타이틀"></w2:column>
        …  (column1 ~ column5, 전부 width="70")
      </w2:row>
    </w2:header>

    <w2:gBody id="" style="">
      <w2:row>
        <w2:column blockSelect="false" displayMode="label" id="col0"
                   inputType="text" removeBorderStyle="false" width="70"></w2:column>
        …  (col1 ~ col5)
      </w2:row>
    </w2:gBody>
  </w2:gridView>
</xf:group>`,
      points: [
        '<code>&lt;w2:header&gt;</code>는 컬럼 <b>정의</b>, <code>&lt;w2:gBody&gt;</code>는 각 컬럼의 <b>표시 방식</b>입니다. 데이터 행이 몇 개든 각각 한 세트만 나갑니다.',
        '데이터 행에 적은 텍스트는 여기가 아니라 <b>별도의 <code>&lt;w2:dataList&gt;</code></b>로 나가고, 그리드는 <code>dataList="data:…"</code>로 그것을 가리킵니다.',
        '<b><code>width="70"</code>과 <code>height:153px</code>은 PC·모바일 공통으로 변환기가 박는 값입니다.</b> Figma에서 잰 폭(모바일 기준 컬럼당 90)은 나가지 않습니다.',
        '<b>모바일용 속성은 하나도 붙지 않습니다.</b> 화면이 달라지는 것은 전부 <code>base_mobile.css</code>가 하는 일이고, XML은 PC와 같은 것이 나갑니다.',
        '<code>&lt;w2:caption&gt;</code> 값은 항상 <code>this is a grid caption.</code>입니다 — 변환기 고정 문구입니다.',
      ],
    },
  },

  {
    chapter: 11, index: 2, id: 'grid-form',
    name: '그리드 폼 (grid-form)',
    summary: '셀에서 직접 입력·선택하는 그리드. <b>셀에 그린 위젯은 모양이 아니라 「컬럼 타입」 한 글자로 환원</b>되며, 이 규칙은 모바일에서도 같습니다.',
    capture: null,
    figmaNodeId: '(모바일 미확정 — 그리드 폼 전용 노드 id 미확인. 기준 = 그리드와 같은 15537:5644, 셀 컴포넌트 <code>Grid/HeaderCell</code> 15382:2906 · <code>Grid/BodyCell</code> 15382:2896)',

    build: {
      tree: `gf_group_gvwbox              375 풀블리드 · padding 0 20
└ gf_gridview_gvw            폭 = 컬럼수 × 90
   ├ header_row              셀 개수 = 컬럼 개수
   ├ body_row                셀마다 판정용 아이콘을 하나씩 둡니다
   │  ├ cell
   │  │  └ input             아이콘 없음                → text 컬럼
   │  ├ cell
   │  │  └ input
   │  │     └ ico_select     → 셀렉트 컬럼
   │  ├ cell
   │  │  └ input
   │  │     └ ico_calendar   → 달력 컬럼
   │  ├ cell
   │  │  └ ico_radio         → 라디오 컬럼 (상자 20 × 20)
   │  ├ cell
   │  │  └ ico_check         → 체크박스 컬럼 (상자 20 × 20)
   │  └ cell
   │     └ input
   │        └ ico_search     → 검색 이미지 컬럼
   └ footer_row              ★ 이름에 "footer" → 합계 행`,
      points: [
        {
          t: '컬럼 타입은 셀 안 아이콘 이름이 정합니다 — PC와 같습니다',
          d: '<code>ico_check</code>→체크박스, <code>ico_radio</code>→라디오, <code>ico_select</code>→셀렉트, <code>ico_calendar</code>→달력, <code>ico_spinner</code>→스피너, <code>ico_search</code>→검색 이미지, <code>ico_drilldown</code>→계층(11.4). <b>이름에 그 조각이 들어 있기만 하면</b> 걸리므로 <code>ico_spinner_updown</code>도 스피너입니다.',
        },
        {
          t: '아이콘 대신 노드명 두 번째 조각으로도 됩니다',
          d: '<code>check_checkbox_item</code>처럼 <b>두 번째 조각이 위젯 이름</b>이면 그 타입이 됩니다. 2장의 이름 규칙과 같은 방식입니다.',
        },
        {
          t: '<b>그리는 기준선 — 셀마다 아이콘 하나</b>',
          d: '체크박스·셀렉트·버튼을 셀 안에 정성껏 그려도 <b>컬럼 타입 한 글자로만 환원</b>되고 실제 위젯은 프레임워크가 그립니다. <b>셀마다 판정용 <code>ico_*</code> 하나면 충분</b>하고, 필요하면 입력칸 윤곽 하나만 더 둡니다.',
        },
        {
          t: '행번호(<code>No</code>) 칸은 <b>44</b> · 배경은 데이터 칸과 같은 흰색',
          d: '행번호 열은 4단계 규칙이 아니라 <b>전용 규칙</b>으로 잡혀 <b>44</b>가 되고 좌우 여백이 4로 좁혀집니다(헤더 <code>No</code>가 34, 바디 <code>1.</code>이 33을 필요로 해서 <b>열 최소 폭을 36</b>으로 벌려 둔 값입니다 — <code>100.</code>까지 수용). 배경은 <b>데이터 칸과 같은 흰색</b>입니다 — 한때 이 칸의 배경을 벗겨 두었더니 엔진이 행에 직접 박아 둔 <b>얼룩(zebra) 색이 거기만 비쳐</b> 회색으로 보였고, 흰색을 다시 칠해 바로잡았습니다.',
        },
        {
          t: '셀 안 체크박스·라디오는 <b>20 × 20</b>',
          d: '폼의 체크·라디오와 <b>같은 값(20)</b>을 씁니다. 같은 Figma 변수를 공유하는 컨트롤이라 한 값으로 통일돼 있습니다. 상자만 든 셀은 좌우 여백이 0이 되어 컨트롤이 열 폭을 온전히 씁니다.',
        },
        {
          t: '합계 행은 이름에 <code>footer</code>',
          d: '이름에 <code>footer</code>가 든 행은 그리드 하단에 고정되는 합계 행(<code>&lt;w2:footer&gt;</code>)이 됩니다. 그 행의 텍스트는 데이터가 아니라 <b>고정 표시값</b>으로 나갑니다.',
        },
      ],
    },
    pitfalls: [
      '<b>컬럼 타입은 셀 안 아이콘(<code>ico_*</code>)이나 위젯 노드명으로 지정합니다.</b> 컬럼 제목으로 판정되는 경우는 제목이 <code>select</code>·<code>calendar</code> 등 <b>영문 위젯 이름과 완전히 같을 때</b>뿐이고, 한글 제목으로는 걸리지 않습니다.',
      '<b>아이콘 이름은 조각이 붙어 있어야 합니다.</b> <code>icon_check</code>·<code>check_icon</code>은 조각이 갈라져 걸리지 않습니다.',
      '<b>한 컬럼에는 한 종류 위젯만 둡니다.</b> 행마다 다르게 두면 변환기가 위에서부터 훑어 <b>처음 걸린 것</b>을 그 컬럼 전체 타입으로 씁니다.',
      '<b>셀 안 셀렉트는 겉모양만 그립니다.</b> 선택 항목은 <code>new row</code> 3개로 고정되므로 실제 항목은 화면 인수 때 따로 전달합니다.',
      '<b>행번호 칸을 넓게 그려도 44입니다.</b> 열 폭은 CSS가 정합니다.',
    ],
    limits: [
      '셀렉트·자동완성·체크콤보의 선택 항목 내용은 지정할 수 없습니다(<code>new row</code> 3개 고정).',
      '컬럼별 편집 가능 여부·필수 여부·입력 형식(숫자·날짜 포맷)은 지정할 수 없습니다.',
      '한 컬럼에 두 종류 위젯을 섞을 수 없습니다.',
      '11.1의 제약이 그대로 적용됩니다 — 컬럼 폭·높이 고정, 화면 열 폭은 CSS 4단계.',
    ],
    xmlOut: {
      note: '<b>변환 결과 XML은 PC와 동일합니다.</b> 컬럼이 많아 대표 항목만 남기고 줄였습니다.',
      code: `<w2:gridView style="height:153px;" autoFit="allColumn" class="gvw" dataList="data:…">
  <w2:header> … 컬럼 제목들 … </w2:header>

  <w2:gBody id="" style="">
    <w2:row>
      <w2:column … id="col0" inputType="text" width="70"></w2:column>

      <w2:column … id="col3" inputType="select" width="70" viewType="icon">
        <w2:choices>
          <w2:item><w2:label><![CDATA[new row]]></w2:label><w2:value><![CDATA[]]></w2:value></w2:item>
          …  (항목 3개가 고정으로 들어갑니다)
        </w2:choices>
      </w2:column>

      <w2:column … id="col4" inputType="calendar" width="70" viewType="icon"></w2:column>
      <w2:column … id="col5" inputType="radio"    width="70"></w2:column>
      <w2:column … id="col6" inputType="checkbox" width="70"></w2:column>
      <w2:column … id="col9" inputType="textImage" width="70" viewType="icon"
                 imageSrc="/cm/images/base/ico_search.svg" imageHeight="16" imageWidth="24"></w2:column>
    </w2:row>
  </w2:gBody>

  <w2:footer id="" style="">
    <w2:row>
      <w2:column id="footerCol0" width="70" inputType="text" displayMode="label" value="합계"></w2:column>
      …
    </w2:row>
  </w2:footer>
</w2:gridView>`,
      points: [
        '셀에 그린 위젯은 <code>inputType</code> 속성 하나로만 나가고, 위젯 레이어 자체는 XML에 없습니다.',
        '셀렉트 계열에는 <b><code>new row</code> 항목 3개가 고정으로</b> 나갑니다. Figma에 적은 항목 텍스트는 쓰이지 않습니다.',
        '검색 이미지 컬럼의 아이콘 경로·크기(<code>imageWidth="24"</code> 등)도 고정값입니다. <b>화면에서 보이는 크기는 모바일 CSS가 다시 정합니다.</b>',
        '합계 행 컬럼은 <code>footerCol0</code>부터 따로 번호가 붙습니다.',
      ],
    },
  },

  {
    chapter: 11, index: 3, id: 'grid-sort',
    name: '그리드 — 정렬·툴팁·사용자필터 (grid-sort)',
    summary: '정렬·툴팁·사용자필터를 그려 둔 그리드. <b>세 기능 모두 결과에 나가지 않는다</b>는 것을 확인하는 항목이며, 모바일에서는 여기에 <b>헤더 라벨이 열 폭을 끌어올린다</b>는 규칙이 하나 더 붙습니다.',
    capture: null,
    figmaNodeId: '(모바일 미확정 — 정렬·툴팁 전용 노드 id 미확인. 기준 = 그리드와 같은 15537:5644)',

    build: {
      tree: `gs_group_gvwbox
└ gs_gridview_gvw
   ├ header_row        셀 8개 — 7번째 제목이 "툴팁"입니다
   ├ body_row
   │  ├ cell × 5       비어 있습니다        → text 컬럼
   │  ├ cell
   │  │  └ ico_check   → 체크박스 컬럼
   │  ├ cell
   │  │  └ ico_radio   → 라디오 컬럼
   │  └ cell
   │     └ label       "사용자필터1" — 그냥 글자입니다(필터 기능이 아닙니다)
   └ body_row          (2번째 행, 동일)`,
      points: [
        {
          t: '<b>이 항목의 요점은 「안 나간다」는 사실입니다</b>',
          d: '이름은 정렬·툴팁·사용자필터이지만 <b>결과 XML에는 그 기능을 켜는 속성이 하나도 없습니다.</b> 컬럼 정렬 여부, 제목 툴팁, 사용자 정의 필터는 <b>Figma로 전달할 수 없습니다.</b> 모바일도 같습니다.',
        },
        {
          t: '「툴팁」·「사용자필터1」은 그냥 글자입니다',
          d: '7번째 컬럼 제목 <code>툴팁</code>과 8번째 컬럼 데이터 <code>사용자필터1</code>은 모두 <b>일반 텍스트</b>로 나갑니다. 제목에 아이콘이 붙거나 필터 UI가 생기지 않습니다.',
        },
        {
          t: '<b>모바일 전용 — 헤더에 이름이 붙은 열은 폭이 L(152)로 올라갑니다</b>',
          d: '체크박스·라디오 컬럼이라도 <b>헤더 칸에 라벨이 있으면</b> 선택 열이 아니라 <b>이름 있는 데이터 열</b>로 보고 <b>L(152)</b>을 줍니다. 44를 주던 시절에는 <code>checkbox</code>·<code>radio</code> 같은 헤더 글자가 <b>44px 칸에서 한 글자씩 세로로 쪼개졌습니다.</b> 헤더 칸에 <b>체크박스가 직접 들어 있고 라벨이 없을 때만</b> S(44)입니다.',
        },
        {
          t: '빈 셀은 빈 데이터로 나갑니다',
          d: '앞 5개 셀은 텍스트가 없어 데이터가 빈 문자열이 됩니다. <b>컬럼은 8개 그대로</b>입니다 — 컬럼 수는 헤더가 정하기 때문입니다(11.1).',
        },
      ],
    },
    pitfalls: [
      '<b>정렬·필터가 필요하면 화면 인수 때 말로 전달합니다.</b> 헤더에 화살표·필터 아이콘을 그려도 기능은 켜지지 않으며 개발 단계에서 붙입니다.',
      '<b>컬럼 제목에 기능 이름을 쓰지 않습니다.</b> 제목 <code>툴팁</code>은 기능이 아니라 글자인데, 인수자가 그 기능이 있는 컬럼으로 오해합니다.',
      '<b>일반 텍스트 컬럼 제목에 <code>select</code>·<code>checkbox</code> 같은 영문 위젯 이름을 쓰지 않습니다.</b> 의도와 무관하게 위젯 컬럼으로 변환됩니다(11.2).',
      '<b>헤더 글자가 잘린다고 줄바꿈으로 풀지 않습니다.</b> 헤더 한 줄 유지가 정본이고, 폭을 올리는 쪽이 현행입니다.',
    ],
    limits: [
      '컬럼 정렬 가능 여부는 지정할 수 없습니다.',
      '컬럼 제목 툴팁은 지정할 수 없습니다.',
      '사용자 정의 필터 UI는 지정할 수 없습니다.',
      '11.1의 제약이 그대로 적용됩니다.',
    ],
    xmlOut: {
      note: '<b>변환 결과 XML은 PC와 동일합니다.</b> 11.1과 구조가 같아 컬럼 부분만 줄였습니다. <b>정렬·툴팁·필터 속성이 없다는 점</b>이 확인 대상입니다.',
      code: `<w2:gridView style="height:153px;" autoFit="allColumn" class="gvw" dataList="data:…">
  <w2:caption id="caption1" style="" value="this is a grid caption."></w2:caption>
  <w2:header>
    <w2:row>
      …
      <w2:column id="column6" width="70" displayMode="label" value="툴팁"></w2:column>
      <w2:column id="column7" width="70" displayMode="label" value="타이틀"></w2:column>
    </w2:row>
  </w2:header>
  <w2:gBody>
    <w2:row>
      …
      <w2:column … id="col5" inputType="checkbox" width="70"></w2:column>
      <w2:column … id="col6" inputType="radio"    width="70"></w2:column>
      <w2:column … id="col7" inputType="text"     width="70"></w2:column>
    </w2:row>
  </w2:gBody>
</w2:gridView>`,
      points: [
        '정렬(<code>sortable</code>)·툴팁·필터에 해당하는 속성이 <b>나가지 않습니다.</b> 그 기능은 화면 구성 후 개발 단계에서 붙입니다.',
        '「툴팁」은 컬럼 제목 문자열(<code>value="툴팁"</code>)로만 나갔습니다.',
        '<b>열 폭을 올리는 판정은 XML이 아니라 CSS가 합니다.</b> <code>width="70"</code>은 그대로 나가고, 화면에서 152가 되는 것은 헤더 라벨을 보고 모바일 CSS가 정한 결과입니다.',
      ],
    },
  },

  {
    chapter: 11, index: 4, id: 'grid-drilldown',
    name: '그리드 드릴다운 (grid-drilldown)',
    summary: '한 컬럼에서 상위·하위 관계를 펼치고 접는 그리드. <b>계층을 레이어 중첩이 아니라 텍스트 들여쓰기 값으로</b> 판정하며, 이 규칙은 모바일에서도 같습니다.',
    capture: null,
    figmaNodeId: '(모바일 미확정 — 드릴다운 전용 노드 id 미확인. 기준 = 그리드와 같은 15537:5644)',

    build: {
      tree: `dd_group_gvwbox
└ dd_gridview_gvw
   ├ header_row                  셀 3개   → 컬럼 3개
   │  ├ cell
   │  │  └ ico_check             → 체크박스 컬럼
   │  ├ cell
   │  │  └ label                 "계층"
   │  └ cell
   │     └ label                 "버튼"
   ├ body_row                    1단계 행
   │  ├ cell
   │  │  └ ico_check
   │  ├ cell
   │  │  ├ ico_drilldown_minus   ← 이 컬럼이 계층 컬럼이 됩니다
   │  │  └ label                 "depth1" · 들여쓰기 0    → 1단계
   │  └ cell
   │     └ input
   ├ body_row                    2단계 행 — 위와 같은 구조
   │  └ cell
   │     ├ ico_drilldown_docu
   │     └ label                 "depth2" · 들여쓰기 +16  → 2단계
   └ body_row                    3단계 행
      └ cell
         ├ ico_drilldown_docu
         └ label                 "depth3" · 들여쓰기 +32  → 3단계`,
      points: [
        {
          t: '계층 컬럼은 <code>ico_drilldown</code>으로 지정합니다',
          d: '데이터 셀 안 아이콘 이름에 <code>ico_drilldown</code>이 들어 있으면 그 컬럼이 계층 컬럼이 됩니다. <code>ico_drilldown_minus</code>(펼침)·<code>ico_drilldown_docu</code>(말단)처럼 뒤에 무엇이 붙어도 됩니다.',
        },
        {
          t: '<b>계층은 중첩이 아니라 들여쓰기입니다 — 트리와 반대</b>',
          d: '트리(12장)는 레이어 중첩으로 계층을 만들지만 <b>드릴다운은 정반대</b>입니다. 행은 전부 같은 레벨에 두고 <b>계층 컬럼 안 텍스트의 들여쓰기 값</b>으로 단계가 정해집니다. 행을 다른 행 하위에 넣으면 <b>그 행은 데이터 행으로도 인식되지 않습니다.</b>',
        },
        {
          t: '단계당 16px씩 일정하게',
          d: '들여쓰기가 가장 작은 행이 1단계이고, <b>들여쓰기 차이 중 4px를 넘는 첫 값</b>이 한 단계 폭이 됩니다(그런 값이 없으면 16px). 템플릿은 <b>0 · 16 · 32</b>로 그려 1·2·3단계가 됐습니다. <b>단계 차이는 5px 이상으로 일정하게</b> 둡니다.',
        },
        {
          t: '기준점은 맞출 필요가 없습니다',
          d: '단계는 <b>행 사이의 차이</b>로만 계산합니다. 계층 컬럼 전체를 오른쪽으로 밀어도 결과는 같습니다 — <b>상대 간격만 맞으면 됩니다.</b>',
        },
        {
          t: '모바일에서 계층 컬럼은 <b>L(152)</b> 폭을 받습니다',
          d: '계층 컬럼에는 헤더 라벨(「계층」)이 있으므로 <b>이름 있는 데이터 열</b>로 잡혀 152가 됩니다. 여기에 단계 들여쓰기까지 얹히므로 <b>3단 이상 깊어지면 글자가 좁아집니다</b> — 컬럼 이름을 짧게 두는 편이 안전합니다. 표시 단계는 <code>showDepth="3"</code>으로 <b>3단까지</b> 고정입니다.',
        },
      ],
    },
    pitfalls: [
      '<b>행을 중첩해서 계층을 만들지 않습니다.</b> 중첩된 행은 데이터 행으로 읽히지 않아 <b>결과에서 사라집니다.</b>',
      '<b>들여쓰기는 16px 배수로 일정하게 둡니다.</b> 값이 들쭉날쭉하면 4px 이하 차이는 같은 단계로 뭉치고, 5px를 넘는 엉뚱한 값이 한 단계 폭으로 채택되어 이후가 전부 어긋납니다.',
      '<b>계층 컬럼에는 모든 행에 텍스트를 둡니다.</b> 텍스트가 없으면 들여쓰기를 잴 수 없어 셀 왼쪽 끝(1단계)으로 처리됩니다.',
      '<b>펼침/접힘 아이콘 종류로는 단계를 표현할 수 없습니다.</b> 아이콘은 「이 컬럼이 계층 컬럼」이라는 표시일 뿐이고 단계는 들여쓰기가 정합니다.',
      '<b>계층은 3단까지 그립니다.</b> 4단 이상은 그려도 표시되지 않습니다.',
    ],
    limits: [
      '표시 단계 수(3단)는 바꿀 수 없습니다.',
      '행의 펼침·접힘 상태는 지정할 수 없습니다.',
      '단계별 아이콘은 지정할 수 없고 프레임워크가 그립니다.',
      '11.1의 제약이 그대로 적용됩니다.',
    ],
    xmlOut: {
      note: '<b>변환 결과 XML은 PC와 동일합니다.</b> 계층 정보는 <code>__depth__</code>라는 <b>보이지 않는 컬럼</b>으로 나갑니다.',
      code: `<w2:gridView … class="gvw" dataList="data:gridData_…">
  <w2:gBody id="" style="">
    <w2:row>
      <w2:column … id="col0" inputType="checkbox" width="70"></w2:column>
      <w2:column … id="col1" inputType="drilldown" width="70"
                 depthColumn="__depth__" depthType="div" showDepth="3" textAlign="left"></w2:column>
      <w2:column … id="col2" inputType="button" width="70" value="버튼"></w2:column>
    </w2:row>
  </w2:gBody>
</w2:gridView>

<!-- 그리드 밖 별도 블록 -->
<w2:dataList id="gridData_…" …>
  <w2:columnInfo>
    <w2:column id="col0" name="col0" dataType="text"></w2:column>
    <w2:column id="col1" name="col1" dataType="text"></w2:column>
    <w2:column id="col2" name="col2" dataType="text"></w2:column>
    <w2:column id="__depth__" name="__depth__" dataType="text"></w2:column>
  </w2:columnInfo>
  <w2:data use="true">
    <w2:row><col1><![CDATA[depth1]]></col1><__depth__><![CDATA[001]]></__depth__></w2:row>
    <w2:row>…<__depth__><![CDATA[002]]></__depth__></w2:row>
    <w2:row>…<__depth__><![CDATA[003]]></__depth__></w2:row>
  </w2:data>
</w2:dataList>`,
      points: [
        '<b><code>__depth__</code> 컬럼이 자동으로 붙습니다.</b> 그릴 대상이 아니고 화면에도 안 보이지만, 각 행의 단계를 <code>001</code>·<code>002</code>·<code>003</code>으로 담습니다.',
        '<b>들여쓰기 픽셀이 세 자리 숫자로 바뀐 것이 계층 정보의 전부</b>입니다. Figma의 x 좌표는 남지 않습니다.',
        '버튼 컬럼의 셀 텍스트는 데이터가 아니라 컬럼의 <code>value</code>로 나가므로 <code>col2</code> 데이터는 비어 있습니다(11.2).',
      ],
    },
  },

  {
    chapter: 11, index: 5, id: 'grid-noresult',
    name: '데이터없음 그리드 + 페이지 목록 (grid-noresult)',
    summary: '조회 결과가 없을 때의 빈 그리드와 하단 페이지 목록. <b>모바일에서는 빈 셀 줄을 지우고 그 자리에 「데이터가 없음」 안내를 띄웁니다.</b>',
    capture: null,
    figmaNodeId: '15537:5644 (template_Mobile · x6 gvwbox+pglbox — 그리드와 페이지 목록이 한 블록입니다)',

    build: {
      tree: `nr_group_gvwbox
└ nr_gridview_gvw    ★ 이름이 "nr_"로 시작 → 데이터없음 그리드
   ├ header_row      셀 개수 → 컬럼 개수 (헤더는 그대로 나갑니다)
   └ body_row × N    데이터 행은 그리지 않아도 됩니다

page_group_pglbox
└ page_pagelist_pgl
   └ pgn_group × N   ← 화살표·숫자를 몇 개 그려도 나가지 않습니다`,
      points: [
        {
          t: '이름 조각 하나로 빈 그리드가 됩니다',
          d: '그리드 레이어 이름이 <b><code>nr_</code>로 시작</b>하거나 이름에 <code>noresult</code>·<code>no_result</code>가 들어 있으면 데이터없음 그리드가 됩니다. 템플릿은 <code>nr_gridview_gvw</code>로 <code>nr_</code> 방식을 씁니다.',
        },
        {
          t: '<b>데이터 행은 그리지 않습니다 — 헤더만 정확히</b>',
          d: '데이터없음으로 판정되면 <b>데이터 행이 나가지 않고</b> 「데이터가 없음」 메시지 설정이 붙습니다. 컬럼(헤더)은 그대로 나가므로 <b>헤더 행만 정확히 그립니다.</b>',
        },
        {
          t: '<b>모바일 전용 — 빈 셀 한 줄을 지우고 그 자리에 안내를 띄웁니다</b>',
          d: '엔진은 데이터가 0건이어도 <b>자리표시용 빈 행 하나</b>를 남겨 둡니다. 모바일 CSS는 빈 그리드에서 <b>그 행을 감추고</b>, 엔진이 만들어 두고 숨겨 두던 「데이터가 없음」 안내를 <b>보이게</b> 해서 <b>데이터 셀 자리(헤더를 뺀 본문 영역) 한가운데</b>에 놓습니다. 안내 모양(아이콘이 글자 왼쪽, 둘이 함께 가운데)은 원래 CSS가 이미 완성해 둔 것을 그대로 씁니다.',
        },
        {
          t: '빈 그리드라도 <b>열 폭 고정과 가로 스크롤은 그대로</b>입니다',
          d: '한때 빈 그리드에서 열 폭 고정을 풀어 표를 컨테이너 폭에 맞춰 본 적이 있으나 <b>방향을 되돌렸습니다</b> — 열 폭 4단계 고정 + 가로 스크롤 유지가 정본입니다. 그리는 쪽에서는 <b>데이터가 있는 그리드와 똑같이</b> 그리면 됩니다.',
        },
        {
          t: '페이지 목록은 컨테이너와 이름만 있으면 됩니다',
          d: '<code>pglbox</code> 그룹 안에 두 번째 조각이 <code>pagelist</code>인 레이어를 두면 끝입니다. <b>안에 그린 화살표·페이지 번호는 나가지 않습니다.</b> 모바일에서 <b>선택된 페이지 칩은 파랑 <code>#237AF3</code></b>입니다(PC는 어두운 회색).',
        },
      ],
    },
    pitfalls: [
      '<b>일반 그리드의 하위 레이어 이름에 <code>noresult</code>가 들어가지 않게 합니다.</b> 들어가면 데이터가 통째로 빠지므로, 데이터가 안 보이면 여기부터 봅니다.',
      '<b><code>nr_</code>은 그리드로 매핑되는 레이어 이름에 붙입니다.</b> 바깥 그룹(<code>nr_group_gvwbox</code>)에만 붙이면 걸리지 않습니다.',
      '<b>페이지 목록은 겉모양만 그립니다.</b> 화살표 종류와 현재 페이지 위치는 전달되지 않습니다.',
      '페이지 목록을 <code>pglbox</code> 없이 혼자 두면 위치·여백 CSS가 걸리지 않습니다.',
      '<b>안내 문구 위치를 Figma에서 옮길 수 없습니다.</b> 세로 위치는 모바일 CSS가 본문 영역 한가운데로 계산합니다.',
    ],
    limits: [
      '「데이터가 없음」 문구는 바꿀 수 없습니다.',
      '페이지 목록의 버튼 개수·화살표 종류·현재 페이지는 지정할 수 없습니다.',
      '페이지 크기도 지정할 수 없고 프레임워크 기본값이 적용됩니다.',
      '11.1의 제약이 그대로 적용됩니다.',
    ],
    xmlOut: {
      note: '<b>변환 결과 XML은 PC와 동일합니다.</b> 데이터없음 그리드는 <b>데이터 목록이 빈 채로</b> 나가고, 페이지 목록은 한 줄로 나갑니다.',
      code: `<xf:group class="gvwbox">
  <w2:gridView style="height:153px;" autoFit="allColumn" class="gvw"
               dataList="data:gridData_…" noResultMessage="데이터가 없음">
    <w2:header> … 컬럼(그린 그대로) … </w2:header>
    <w2:gBody>  … 컬럼 표시 설정 … </w2:gBody>
  </w2:gridView>
</xf:group>

<w2:dataList id="gridData_…" …>
  <w2:columnInfo> … </w2:columnInfo>
  <w2:data use="true"></w2:data>          ← 데이터 행이 하나도 없습니다
</w2:dataList>

<!-- 페이지 목록 -->
<xf:group class="pglbox">
  <w2:pageList displayButtonType="display" adaptive="none" class="pgl" id="pageList_…"></w2:pageList>
</xf:group>`,
      points: [
        '<code>noResultMessage="데이터가 없음"</code>이 자동으로 붙습니다 — 문구는 그릴 대상이 아닙니다.',
        '데이터 목록의 <code>&lt;w2:data&gt;</code>가 비어 있습니다. Figma에 그린 행이 나가지 않은 결과입니다.',
        '<code>&lt;w2:pageList&gt;</code>는 <b>하위 항목 없이 한 줄</b>로 나갑니다 — 그린 화살표·번호가 빠진 결과입니다.',
        '<b>「빈 줄을 지우고 안내를 띄운다」는 XML에 없습니다.</b> 전부 모바일 CSS가 하는 일이라 결과 XML은 PC와 한 글자도 다르지 않습니다.',
      ],
    },
  },

  /* ===================== 12장. 트리 ===================== */

  {
    chapter: 12, index: 1, id: 'tree',
    name: '트리 (tree)',
    summary: '상위·하위 관계를 펼치고 접는 목록. <b>계층을 레이어 중첩으로</b> 만들며(드릴다운과 반대), 모바일에서는 노드 한 줄이 커지고 형제 노드 사이가 벌어집니다.',
    capture: null,
    figmaNodeId: '15386:28103 (template_Mobile · t7 tvwbox) · 노드 실측 <code>tree1_treeview_tvw</code> 15384:22024 · 행 컴포넌트 <code>nrow</code> 15382:2865',

    build: {
      tree: `tree1_group_tvwbox         335 (카드 안 인셋)
└ tree1_treeview_tvw       높이 300   ← 이 높이가 결과에 실립니다
   ├ n_node                2번째 조각이 "node" → 노드 하나
   │  └ nrow               노드 한 줄 — 높이 28 · 아이콘과 글자 사이 6
   │     ├ ico_TreeDocu    아이콘 20 (프레임워크가 그립니다)
   │     └ nlabel          "New" ← 노드 라벨. 글자 16
   ├ n_node                2번째 노드 — 형제 노드 사이 8
   │  ├ nrow
   │  │  ├ ico_TreeMinus
   │  │  └ nlabel          "New"
   │  └ n_node             ★ 노드 안에 노드 → 그대로 하위 계층이 됩니다
   │     └ nrow
   │        ├ ico_TreeDocu
   │        └ nlabel       "New"
   └ n_node                3단계까지 중첩한 예
      ├ nrow
      └ n_node
         └ n_node`,
      points: [
        {
          t: '노드는 두 번째 조각이 <code>node</code>와 <b>완전히 같아야</b> 합니다',
          d: '<code>n_node</code>처럼 두 번째 조각이 <code>node</code>인 프레임만 트리 노드가 됩니다. <b>부분일치가 아니라 완전일치</b>라 <code>n_nodes</code>·<code>n_treenode</code>는 노드가 아닙니다. 접두어(<code>n</code>)는 자유입니다. <b>이름 규칙은 PC와 같습니다.</b>',
        },
        {
          t: '<b>계층은 중첩으로 — 드릴다운과 반대</b>',
          d: '노드 프레임을 다른 노드 프레임 <b>안에</b> 넣으면 하위 계층이 됩니다. 11.4 드릴다운은 같은 레벨에 두고 <b>들여쓰기 픽셀</b>로 계층을 만들지만, 트리는 <b>중첩만 보고 들여쓰기는 보지 않습니다.</b>',
        },
        {
          t: '라벨은 노드 안 텍스트를 <b>이어 붙인 값</b>입니다',
          d: '노드 안 텍스트를 순서대로 이어 하나의 라벨로 만듭니다(<b>하위 노드의 텍스트는 제외</b>). 한 줄을 텍스트 두 개로 나눠 그리면 <b>하나로 붙어</b> 나갑니다(「New」+「(3)」 → 「New(3)」).',
        },
        {
          t: '모바일 치수 — 노드 한 줄 <b>28</b> · 글자 <b>16</b> · 형제 사이 <b>8</b>',
          d: '노드 한 줄은 높이 <b>28</b>(위아래 여백 4), 아이콘과 글자 사이 <b>6</b>, 라벨 글자 <b>16 Regular</b>입니다. <b>형제 노드끼리는 8만큼 벌어집니다</b> — PC에는 없는 모바일 규칙입니다. 펼침·문서 아이콘은 <b>20 × 20</b>입니다.',
        },
        {
          t: '<b>트리 높이는 잰 값이 그대로 실립니다</b>',
          d: '트리 레이어의 Figma 높이가 <code>style="height:300px"</code>로 결과에 나갑니다. 클래스가 붙어 있어도 예외적으로 나가는 값이며 <b>트리의 표시 높이는 Figma에서 정합니다.</b> 5장의 「나가는 네 가지 값」 중 하나이고 <b>모바일도 같습니다.</b>',
        },
      ],
    },
    pitfalls: [
      '<b>노드 이름의 두 번째 조각을 <code>node</code> 외의 값으로 지으면</b> 그 프레임은 노드가 아니게 되어 <b>하위 노드까지 통째로 빠집니다.</b> 완전일치입니다.',
      '<b>계층은 레이어 중첩으로 만듭니다</b>(드릴다운과 반대). 같은 레벨에 두고 x만 밀면 전부 1단계가 됩니다.',
      '<b>체크박스가 필요 없으면 노드 안 레이어 이름에 <code>check</code>를 쓰지 않습니다.</b> 하나만 들어 있어도 트리 전체에 체크박스가 켜집니다.',
      '<b>노드 한 줄은 텍스트 레이어 하나로 그립니다.</b> 두 개로 나누면 라벨이 붙어서 나갑니다.',
      '<b>트리 높이를 화면 높이에 맞춰 크게 그리지 않습니다.</b> 잰 값이 그대로 실리므로 375 화면에서 지나치게 긴 트리가 됩니다. 템플릿 기준 300이 무난합니다.',
    ],
    limits: [
      '노드별 아이콘은 지정할 수 없고 전부 빈 값으로 나갑니다.',
      '노드의 펼침 상태와 선택 상태는 지정할 수 없습니다.',
      '노드별 체크박스 제어는 불가능하고 트리 전체 단위(<code>showCheckbox</code>)로만 켜집니다.',
      '노드에 붙는 값(코드값 등)은 지정할 수 없습니다.',
    ],
    xmlOut: {
      note: '<b>변환 결과 XML은 PC와 동일합니다.</b> 노드마다 빈 태그가 9개씩 나와 길어지므로 첫 노드만 남기고 줄였습니다.',
      code: `<xf:group class="tvwbox">
  <w2:treeview dataType="listed" tooltipGroupClass="false" class="tvw" style="height:300px">

    <w2:node>
      <w2:label><![CDATA[New]]></w2:label>
      <w2:value><![CDATA[]]></w2:value>
      <w2:folder><![CDATA[]]></w2:folder>
      <w2:checkbox><![CDATA[]]></w2:checkbox>
      <w2:checkboxDisabled><![CDATA[]]></w2:checkboxDisabled>
      <w2:image><![CDATA[]]></w2:image>
      <w2:iconImage><![CDATA[]]></w2:iconImage>
      <w2:selectedImage><![CDATA[]]></w2:selectedImage>
      <w2:expandedImage><![CDATA[]]></w2:expandedImage>
      <w2:leafImage><![CDATA[]]></w2:leafImage>
    </w2:node>

    <w2:node>
      <w2:label><![CDATA[New]]></w2:label>
      …  (빈 태그 9개)
      <w2:node>                       ← Figma에서 노드를 노드 안에 넣은 결과
        <w2:label><![CDATA[New]]></w2:label>
        …
      </w2:node>
    </w2:node>

  </w2:treeview>
</xf:group>`,
      points: [
        '<b>라벨만 값이 차고 나머지 9개 태그는 빈 채로</b> 나갑니다. 아이콘·값·폴더 여부를 그려도 전달되지 않습니다.',
        'Figma의 노드 중첩이 <code>&lt;w2:node&gt;</code> 중첩으로 그대로 옮겨졌고, 들여쓰기 값은 나가지 않습니다.',
        '<b><code>style="height:300px"</code>는 Figma에서 잰 높이입니다.</b> 모바일에서도 같은 값이 나갑니다 — 노드 한 줄 높이(28)·형제 간격(8)은 CSS가 정하므로 XML에 없습니다.',
        '<code>dataType="listed"</code>·<code>tooltipGroupClass="false"</code>는 변환기 기본값입니다.',
      ],
    },
  },

  {
    chapter: 12, index: 2, id: 'tree-virtual',
    name: '트리 — virtual (tree-virtual)',
    summary: '구조는 12.1과 똑같고 <b>클래스 토큰 하나만</b> 다릅니다. 이름의 virtual에 해당하는 기능은 결과에 나가지 않습니다.',
    capture: null,
    figmaNodeId: '(모바일 미확정 — virtual 전용 노드 id 미확인. 기준 = 12.1과 같은 15386:28103)',

    build: {
      tree: `tree2_group_tvwbox        (12.1과 동일)
└ tree2_treeview_mn_tvw   ← 다른 곳은 여기, 클래스 토큰 하나뿐입니다
   ├ n_node               12.1의 노드와 글자 하나 다르지 않습니다
   ├ n_node               (2단계·3단계 중첩까지 동일)
   └ n_node`,
      points: [
        {
          t: '<code>tvw</code>를 <code>mn_tvw</code>로 바꿉니다',
          d: '노드 구조·중첩·라벨 규칙은 12.1과 <b>완전히 같습니다.</b> 트리 레이어 이름의 클래스 자리만 <code>mn_tvw</code>로 씁니다. 7장의 <code>tit_main</code>/<code>tit_sub</code>, 9장의 <code>tbc</code>/<code>tbc_sub</code>와 같은 방식입니다.',
        },
        {
          t: '<b>virtual 기능은 결과에 나가지 않습니다</b>',
          d: '이름은 virtual(대용량 목록 처리)이지만 <b>결과 XML에 그 기능을 켜는 속성이 없습니다.</b> 나가는 것은 <code>class="mn_tvw"</code>뿐이고, 11.3의 정렬·툴팁·필터와 같은 경우입니다.',
        },
        {
          t: '<b>모바일 함정 — 가상 트리는 클래스에 <code>w2</code> 접두어가 없습니다</b>',
          d: '일반 트리 라벨은 <code>w2treeview_label</code>인데 <b>가상 트리는 <code>treeview_label</code></b>(접두어 없음)입니다. 그래서 모바일 CSS는 <b>가상 트리용 규칙을 따로 갖고</b> 라벨 글자 16을 맞춥니다. 형태를 확인할 때 「같은 트리인데 왜 글자가 다르지」 싶으면 이 차이를 떠올립니다.',
        },
        {
          t: '높이는 12.1과 같이 잰 값이 나갑니다',
          d: '트리 레이어의 Figma 높이가 그대로 실립니다. 두 항목의 템플릿 높이가 같아(300) 결과도 같습니다.',
        },
      ],
    },
    pitfalls: [
      '<b>클래스를 <code>mn_tvw</code>가 아니라 <code>mn</code>·<code>virtual</code>로 쓰면</b> 의도한 클래스가 붙지 않습니다. 토큰 전체를 씁니다.',
      '<b>대용량 목록 처리가 필요하면 화면 인수 때 따로 전달합니다.</b> 클래스 이름만으로는 동작이 전달되지 않습니다.',
      '12.1의 주의사항이 그대로 적용됩니다 — 노드 이름 완전일치, 중첩 기반 계층, <code>check</code>가 든 이름 때문에 체크박스가 켜지는 것.',
      '<b>모바일 화면에서 두 트리는 거의 같아 보입니다.</b> 검수는 캔버스가 아니라 결과 XML의 <code>class</code>로 합니다.',
    ],
    limits: [
      'virtual(대용량 목록) 동작은 표현할 수 없습니다.',
      '<code>mn_tvw</code>의 형태는 프로젝트 CSS가 정합니다. 템플릿 CSS만 걸었을 때는 12.1과 차이가 거의 없습니다.',
      '12.1의 제약이 그대로 적용됩니다 — 노드별 아이콘·펼침 상태·노드별 체크 미반영.',
    ],
    xmlOut: {
      note: '<b>변환 결과 XML은 PC와 동일합니다.</b> 12.1의 결과와 <code>class</code>만 다릅니다.',
      code: `<xf:group class="tvwbox">
  <w2:treeview dataType="listed" tooltipGroupClass="false" class="mn_tvw" style="height:300px">
    <w2:node>
      <w2:label><![CDATA[New]]></w2:label>
      …  (빈 태그 9개 · 하위 노드 중첩까지 12.1과 동일)
    </w2:node>
    …
  </w2:treeview>
</xf:group>`,
      points: [
        '<code>class="tvw"</code>가 <code>class="mn_tvw"</code>로 바뀐 것 말고는 12.1과 구조가 같습니다.',
        '<b>virtual·대용량·스크롤에 해당하는 속성이 나가지 않습니다.</b> 결과에서 두 항목은 클래스로만 구분됩니다.',
      ],
    },
  },

  /* ===================== 13장. 버튼 ===================== */

  {
    chapter: 13, index: 1, id: 'button',
    name: '버튼 (button)',
    summary: '동작을 실행하는 기본 컴포넌트. 모양·아이콘·색은 전부 클래스가 정하고, <b>모바일에서는 어디에 놓였느냐가 규격을 정합니다</b> — 크기를 직접 고르는 것이 아닙니다.',
    capture: null,
    figmaNodeId: '15537:5633 (template_Mobile · x4 버튼 etcbox flex) · 마스터 <code>Button/Text</code> 15382:2733 · <code>Button/Icon</code> 15382:2774',

    build: {
      tree: `def_group_titbox             (버튼을 담아 두기만 하는 상자)
├ lt_group_lt
│  └ sub_textbox_tit_sub     "기본" — 상태 이름 라벨
└ rt_group_rt                다른 요소와 같은 줄 → Small 규격
   ├ b_button_btn_cm         높이 48 · 모서리 6 · 좌우 12 · 글자 16 · 아이콘 16
   │  ├ bicon                (장식 — 매핑 안 됨. 아이콘은 클래스가 그립니다)
   │  └ lbl_textbox          "기본버튼" ← 라벨이 됩니다
   ├ b_button_btn_cm fill    (이하 변형 토큰만 다른 같은 구조)
   └ b_button_btn_cm search

btn_group_btnbox             자기 행을 통째로 차지 → 넓은 배치(여백만 Large)
└ save_button_btn_cm fill pt 높이 48 · 모서리 8 · 좌우 20 · 아이콘 20 · 폭 335(100%)
                             ★ 높이는 48 — Large(56)가 아닙니다`,
      points: [
        {
          t: '<b>규격은 배치가 정합니다</b>',
          d: '버튼이 <b>자기 행을 통째로 차지하면 넓은 배치</b>(좌우 여백 20 · 모서리 8 · 아이콘 20 · 글자와 아이콘 사이 8 — <b>Large의 여백만 쓰고 높이는 48입니다. 56이 아닙니다</b>), <b>다른 요소와 같은 줄에 얹히면 좁은 배치</b>(좌우 여백 12 · 모서리 6 · 아이콘 16 · 사이 4)입니다. <b>여기서 「Large」는 크기 등급 이름이 아니라 여백 묶음의 별명</b>이니, 아래 「높이는 어느 쪽이든 48」과 함께 읽습니다. 자기 행을 차지하는 자리 = 조회 버튼(<code>btn_schbox</code>) · 표의 값칸 안 · 하단 저장·취소(<code>btnbox</code>) · 화면 본문 직속 · 버튼만 담은 그룹. 같은 줄에 얹히는 자리 = <code>titbox</code>의 <code>rt</code> 툴바 · 페이지 타이틀 헤더 · 더보기 목록 · 그리드 안 · <b><code>etcbox</code>(버튼을 죽 나열하는 컨테이너)</b>.',
        },
        {
          t: '<b>높이는 어느 쪽이든 48입니다</b>',
          d: '기본 버튼 높이가 <b>48</b>로 올라가면서, 예전에 있던 「자기 행을 차지하면 키운다」는 승격은 <b>사라졌습니다</b>(기본이 이미 48이라 키울 이유가 없어졌습니다). 그래서 배치가 바꾸는 것은 <b>여백·모서리·아이콘 크기</b>이고 <b>높이는 48로 같습니다.</b> 더 큰 버튼은 클래스를 명시할 때만 나옵니다 — <b>Small 48 · <code>md</code> 52 · <code>lg</code> 56</b>. <b>클래스를 적으면 배치 규칙보다 우선</b>합니다.<br>⚠️ 사양문서 §5-6의 배치 규칙 표는 「자기 행을 통째로 차지 → <b>Large 56</b>」이라고 적고 있으나 <b>이는 개정 전 문장</b>입니다. 기본값이 32이던 시절 만든 승격 규칙을 그대로 둔 채 Large만 56으로 올렸다가 무클래스 버튼이 56으로 나갔고, <b>2026-08-05에 48로 되돌렸습니다</b>(조회 버튼 <code>btn_cm</code> 재실측도 전부 48). <b>56은 <code>lg</code>를 적었을 때만</b> 나옵니다.',
        },
        {
          t: '한 행에 버튼이 하나뿐이면 폭을 꽉 채웁니다',
          d: '세로로 쌓이는 본문의 직속 버튼, 또는 가로 컨테이너에 <b>혼자 있는</b> 버튼은 <b>335(100%)</b>로 늘어납니다. 버튼이 둘 이상이면 한 줄을 나눠 가지므로 늘어나지 않습니다. Figma에서도 <b>가로 FILL</b>로 두어 결과와 맞춥니다. <code>etcbox</code>(나열 컨테이너)와 아이콘 전용 버튼은 여기서 빠집니다.',
        },
        {
          t: '아이콘 전용 버튼은 <b>48 × 48</b> · 텍스트 자식을 두지 않습니다',
          d: '클래스에 <code>icon</code> 토큰을 넣고 <b>안에 텍스트 레이어를 두지 않으면</b> 정사각 아이콘 버튼이 됩니다. 모바일에서는 <b>48 × 48 · 모서리 8 · 아이콘 20</b>입니다. 반대로 글자가 필요한 버튼은 반드시 텍스트 자식을 가져야 합니다 — 변환기는 버튼 라벨을 <b>텍스트 자식에서만</b> 읽습니다.',
        },
        {
          t: '색·아이콘은 클래스가 정합니다',
          d: '<code>btn_cm</code>으로 시작해 <b>변형</b>(<code>pt</code>·<code>fill</code>·<code>copy</code>·<code>save</code>·<code>search</code> 등)을 붙이고, 아이콘 전용은 <code>icon</code>을, 비활성은 <code>disabled</code>를 마지막에 붙입니다. <b><code>btn_cm search</code>면 검색 아이콘, <code>btn_cm save</code>면 저장 아이콘</b>이 CSS로 그려집니다. 강조 버튼은 색을 칠하는 대신 <code>fill pt</code>를 붙입니다(모바일 프라이머리 <code>#237AF3</code>). 비활성은 이름 조각에 <code>disabled</code>(또는 <code>dis</code>)를 넣으면 <code>disabled="true"</code> 속성으로 나가고 <b>클래스에서는 빠집니다.</b>',
        },
      ],
    },
    pitfalls: [
      '<b>정본 문서 안에서도 버튼 높이가 여러 값으로 남아 있습니다.</b> 부록의 「Small 32 / md 40 / lg 48」과 §규칙 2의 「md 40 / lg 48」은 <b>옛 값</b>이고, 확정값은 <b>§5-6 상향본 = Small 48 · medium 52 · Large 56</b>입니다. 이 가이드는 상향본을 기준으로 적었고 <code>base_mobile.css</code>도 같은 값입니다.',
      '<b>기본 버튼의 모서리와 글자 크기도 정본과 CSS가 어긋납니다.</b> 사양문서 §5-6 표의 Small 행은 <b>모서리 4 · 글자 14</b>인데 <b>둘 다 2026-08-05에 사용자 지시로 개정되기 전 값</b>입니다 — 모서리는 <b>4 → 6</b>(「기본(Small) radius 4 → 6」), 글자는 <b>14 → 16</b>(「버튼 폰트도 모두 16」)으로 올랐습니다. <b>화면에 나오는 값은 모서리 6 · 글자 16</b>이고 이 가이드는 그쪽으로 적었습니다. <code>md</code>·<code>lg</code>·아이콘 전용의 모서리 8은 그대로입니다.',
      '<b>아이콘 전용 버튼 크기도 정본과 CSS가 어긋납니다.</b> 사양문서 §5-6에는 <code>Button/Icon</code>이 상향 대상이 아니라 32 × 32로 남아 있으나, <b>디자인 템플릿 재실측 결과 48 × 48(모서리 8)로 함께 올라가 있었고</b> CSS가 그 값을 씁니다. <b>화면에 나오는 값은 48</b>입니다.',
      '<b>버튼 크기를 Figma에서 직접 바꿔도 결과에 실리지 않습니다.</b> 배치를 바꾸거나 <code>md</code>·<code>lg</code>를 명시해야 크기가 바뀝니다.',
      '<b>아이콘 클래스는 정해진 목록에만 있습니다.</b> 대응되는 클래스가 없는 아이콘(예: 취소)은 <b>아이콘 클래스를 주지 않고</b> 텍스트 버튼으로 만듭니다. Figma에는 아이콘을 그려 두되, 결과에 나가는 것은 클래스라는 점을 기억합니다.',
      '<b>비활성은 색으로 표현되지 않습니다.</b> 이름에 <code>disabled</code>를 넣어야 합니다.',
      '<b>버튼 이름에 <code>req</code>·<code>error</code>·<code>readonly</code>를 쓰지 않습니다.</b> 버튼이 다루는 상태는 <code>disabled</code>뿐이고 나머지 셋은 클래스에서도 속성에서도 사라집니다.',
    ],
    limits: [
      '배경색·글자색·테두리·모서리는 클래스(CSS)가 정하며 버튼마다 다른 색을 지정할 수 없습니다.',
      '변형 목록에 없는 아이콘은 쓸 수 없습니다.',
      '마우스 오버·클릭 상태는 이름으로 전달할 수 없고 비활성만 <code>disabled</code>로 갑니다.',
      '버튼 안에 아이콘과 텍스트를 함께 두고 <b>아이콘 위치를 지정</b>하는 것은 표현할 수 없습니다 — 순서는 클래스가 정합니다.',
    ],
    xmlOut: {
      note: '<b>변환 결과 XML은 PC와 동일합니다.</b> 변형이 많아 대표 항목만 남겼습니다. <b>크기에 해당하는 값은 하나도 나가지 않습니다</b> — 48/52/56은 전부 CSS가 정합니다.',
      code: `<!-- 기본 -->
<w2:button class="btn_cm">
  <w2:textbox tagname="span" label="기본버튼"></w2:textbox>
</w2:button>
<w2:button class="btn_cm fill pt">
  <w2:textbox tagname="span" label="저장"></w2:textbox>
</w2:button>

<!-- 기본 · 비활성 -->
<w2:button class="btn_cm" disabled="true">
  <w2:textbox tagname="span" label="기본버튼"></w2:textbox>
</w2:button>

<!-- 아이콘 전용 -->
<w2:button class="btn_cm copy icon">
  <w2:textbox tagname="span" label=""></w2:textbox>
</w2:button>

<!-- 크기를 명시할 때만 클래스로 -->
<w2:button class="btn_cm md">
  <w2:textbox tagname="span" label="중간버튼"></w2:textbox>
</w2:button>`,
      points: [
        '<b><code>style</code>이 나가지 않습니다.</b> 버튼의 모양은 <code>class</code>가 정합니다.',
        '라벨은 속성이 아니라 <b>하위 <code>&lt;w2:textbox tagname="span"&gt;</code></b>로 나갑니다. 아이콘 전용 버튼은 그 태그가 <code>label=""</code>로 비어 있고 태그 자체는 남습니다.',
        '<b><code>disabled</code>는 클래스에서 빠지고 속성으로 나갑니다.</b> 이름에 <code>btn_cm copy icon disabled</code>라 적어도 결과 class는 <code>btn_cm copy icon</code>입니다.',
        '<b>배치에 따른 규격 차이는 XML에 나타나지 않습니다.</b> 같은 <code>class="btn_cm"</code>이라도 어느 컨테이너 안에 있느냐로 화면이 달라지므로, 검수는 XML이 아니라 화면에서 합니다.',
        '<code>bicon</code>·<code>lbl_textbox</code> 레이어는 결과에 나가지 않고 라벨 글자만 뽑힙니다.',
      ],
    },
  },

  {
    chapter: 13, index: 2, id: 'trigger',
    name: '트리거 (trigger)',
    summary: '버튼과 모양·구조가 같지만 <b>Figma에서 칠한 배경색이 결과에 실리는</b> 컴포넌트. 이름의 조각 하나로 갈립니다.',
    capture: null,
    figmaNodeId: '(모바일 미확정 — 트리거 전용 노드 id 미확인. 기준 = 버튼과 같은 15537:5633 · 마스터 <code>Button/Text</code> 15382:2733)',

    build: {
      tree: `def_group_titbox           (13.1과 동일)
├ lt_group_lt
│  └ sub_textbox_tit_sub   "기본"
└ rt_group_rt
   ├ t_trigger_btn_cm      2번째 조각이 "trigger" ← 버튼과 다른 곳은 여기 하나뿐입니다
   │  ├ bicon              (장식 — 매핑 안 됨)
   │  └ lbl_textbox        "기본버튼" ← 라벨이 됩니다
   └ t_trigger_btn_cm fill (이하 버튼과 같습니다)`,
      points: [
        {
          t: '두 번째 조각을 <code>trigger</code>로 씁니다',
          d: '<code>b_button_btn_cm</code>을 <code>t_trigger_btn_cm</code>으로 바꿉니다. <b>클래스와 구조는 버튼과 같습니다.</b> 조합 순서(<code>btn_cm</code> → 변형 → <code>icon</code> → <code>disabled</code>)와 아이콘을 클래스가 정하는 방식도 같습니다.',
        },
        {
          t: '<b>트리거는 Figma 채움색이 인라인으로 나갑니다</b>',
          d: 'Figma에서 칠한 색이 <code>style="background-color:rgb(255,255,255)"</code>로 결과에 나갑니다. <b>인라인 스타일은 클래스를 이기므로 트리거의 배경색은 CSS가 아니라 Figma에서 칠한 색이 최종입니다.</b> 버튼에는 이 속성이 나가지 않아 CSS가 배경을 정합니다(13.1) — 이것이 두 컴포넌트의 유일한 차이입니다.',
        },
        {
          t: '크기 규격은 버튼과 같습니다',
          d: '높이 <b>48</b>, <code>md</code> 52 · <code>lg</code> 56, 아이콘 전용 <b>48 × 48</b>까지 13.1과 같은 값을 씁니다. <b>배치가 여백·모서리·아이콘 크기를 정하는 것도 같습니다.</b>',
        },
        {
          t: '<b>모바일 함정 — 트리거의 아이콘은 배경 이미지로 그려집니다</b>',
          d: '일반 버튼은 아이콘을 가상요소로 그리는데 <b>트리거만 배경 이미지</b>로 그립니다. 그래서 왼쪽 여백을 그냥 12로 두면 <b>글자가 아이콘 위로 올라타 겹칩니다.</b> 모바일 CSS는 아이콘을 20으로 키워 왼쪽 12에 놓고 <b>글자를 36부터</b> 시작시켜 이 겹침을 없앴습니다. 아이콘 전용 트리거는 라벨이 없으므로 아이콘을 가운데 둡니다. <b>단, 제목 줄(<code>titbox</code>) 오른쪽에 놓으면 규칙이 달라집니다</b> — 그 자리는 아이콘 버튼 자리라서 글자를 적어도 <b>48 × 48 정사각 아이콘 버튼으로 바뀌고 라벨은 감춰집니다.</b> 위 「완성 모습」이 전부 그 자리라 아이콘만 보이는 것입니다. 글자를 보이게 하려면 제목 줄 밖에 두십시오.',
        },
        {
          t: '어느 쪽을 쓸지는 디자이너가 정하지 않습니다',
          d: '버튼과 트리거는 <b>화면 동작이 다른 컴포넌트</b>입니다. 어느 쪽을 쓰는지는 화면 사양이 정하므로 <b>템플릿에 적힌 대로 따릅니다.</b> 눈으로는 구분되지 않습니다.',
        },
      ],
    },
    pitfalls: [
      '<b>비활성 트리거는 Figma에서도 비활성 색으로 칠합니다.</b> 칠한 색이 인라인으로 나가 CSS를 이기므로, 이름에 <code>disabled</code>를 넣어도 활성 색으로 칠해 두면 그 색이 그대로 나갑니다.',
      '<b>트리거에는 채움색을 반드시 지정합니다.</b> 비워 두면 배경 속성이 나가지 않아 CSS 값이 적용됩니다.',
      '<b>버튼과 트리거는 화면에서 구분되지 않습니다.</b> 검수는 결과 XML의 태그(<code>&lt;xf:trigger&gt;</code> ↔ <code>&lt;w2:button&gt;</code>)로 합니다.',
      '13.1의 주의사항이 그대로 적용됩니다 — 아이콘은 클래스가 정함, <code>icon</code> 토큰 누락, 색만으로는 비활성 미적용, 그리고 <b>사양문서 §5-6과 어긋나는 네 값</b>(배치 승격 결과 높이 56→<b>48</b> · 기본 모서리 4→<b>6</b> · 기본 글자 14→<b>16</b> · 아이콘 전용 32→<b>48</b>).',
    ],
    limits: [
      '글자색·테두리·크기는 버튼과 같이 클래스가 정하고 <b>배경색만</b> 인라인으로 나갑니다.',
      '마우스 오버·클릭 상태의 배경색은 전달할 수 없고 기본 상태의 채움색만 나갑니다.',
      '변형 목록에 없는 아이콘은 쓸 수 없습니다(13.1과 같음).',
    ],
    xmlOut: {
      note: '<b>변환 결과 XML은 PC와 동일합니다.</b> 13.1의 버튼 결과와 다른 곳은 세 가지입니다 — 태그, 라벨 위치, <code>style</code>.',
      code: `<!-- 기본 -->
<xf:trigger type="button" class="btn_cm" style="background-color:rgb(255,255,255)">
  <xf:label><![CDATA[기본버튼]]></xf:label>
</xf:trigger>
<xf:trigger type="button" class="btn_cm pt" style="background-color:rgb(255,255,255)">
  <xf:label><![CDATA[기본버튼]]></xf:label>
</xf:trigger>

<!-- 기본 · 비활성 (Figma에서 회색으로 칠해 둔 결과) -->
<xf:trigger type="button" class="btn_cm" style="background-color:rgb(234,238,241)" disabled="true">
  <xf:label><![CDATA[기본버튼]]></xf:label>
</xf:trigger>

<!-- 아이콘 전용 -->
<xf:trigger type="button" class="btn_cm copy icon" style="background-color:rgb(255,255,255)"></xf:trigger>`,
      points: [
        '<b><code>style="background-color:…"</code>가 나갑니다.</b> Figma에서 칠한 색이 실린 결과이며 버튼에는 없는 속성입니다.',
        '비활성 트리거의 배경색은 <code>rgb(234,238,241)</code>이며 CSS 값이 아니라 <b>Figma에서 칠한 색</b>입니다.',
        '라벨이 <code>&lt;xf:label&gt;</code>로 나갑니다(버튼은 <code>&lt;w2:textbox tagname="span"&gt;</code>). 텍스트가 없으면 그 태그 없이 <b>바로 닫힙니다.</b>',
        '<b>아이콘 겹침을 푸는 여백 값(왼쪽 36 등)은 XML에 없습니다.</b> 전부 모바일 CSS가 하는 일입니다.',
        '<code>type="button"</code>은 변환기 기본값이고, <code>disabled</code>는 버튼과 같이 클래스에서 빠져 속성으로 나갑니다.',
      ],
    },
  },

  /* ===================== 14장. 아코디언 ===================== */

  {
    chapter: 14, index: 1, id: 'accordion',
    name: '아코디언 (accordion)',
    summary: '제목을 눌러 본문을 펼치고 접는 목록. <b>본문은 텍스트 한 줄만 전달됩니다.</b> 모바일에서는 테두리와 모서리가 없는 흰 면으로 그려집니다.',
    capture: null,
    figmaNodeId: '15386:28151 (template_Mobile · t9 acdbox) · 마스터 <code>Mobile/Accordion/Panel</code> 15396:38442',

    build: {
      tree: `acd_group_acdbox              (아코디언을 감싸는 상자 — 바깥 여백 없음)
└ acd_accordion_acd           테두리 없음 · 모서리 없음 · 배경 흰색
   ├ p_panels                 2번째 조각이 "panels" → 패널 하나 (패널 사이 20)
   │  ├ pt_paneltitle         제목 줄 — 높이 24 · 좌우 20 · 글자 16 Bold #212B36
   │  │  ├ ptx_textbox        "Accordion 1" ← 제목이 됩니다
   │  │  └ pnavi
   │  │     └ ico_accordion_up  (장식 — 매핑 안 됨. 화살표 20은 프레임워크가 그립니다)
   │  └ pc_panelcontent       본문 — 위아래 12 · 좌우 20 · 글자 14 #454F5B (제목과 10 띄움)
   │     └ ctx_textbox        "내용" ← 본문이 됩니다(한 줄만)
   ├ p_panels                 2번째 패널 — 접힌 상태로 그려 본문 없음
   │  └ pt_paneltitle
   │     ├ ptx_textbox        "Accordion 2"
   │     └ pnavi
   │        └ ico_accordion_down
   └ p_panels                 3번째 패널 (2번째와 동일)`,
      points: [
        {
          t: '패널 하나는 두 번째 조각이 <code>panels</code>인 프레임입니다',
          d: '<code>p_panels</code>처럼 두 번째 조각이 <b><code>panels</code>와 완전히 같은</b> 직속 하위 항목만 패널로 셉니다. 그 개수가 결과의 패널 개수입니다. <code>panel</code>(단수)이나 <code>p_panel1</code>은 패널이 아닙니다. <b>이름 규칙은 PC와 같습니다.</b>',
        },
        {
          t: '제목과 본문도 두 번째 조각으로 갈립니다',
          d: '패널 안에서 <code>paneltitle</code>이 제목, <code>panelcontent</code>가 본문입니다. 둘 다 <b>패널의 직속 하위</b>여야 하고, 안에서 <b>처음 만나는 텍스트</b>가 값이 됩니다.',
        },
        {
          t: '<b>본문은 텍스트 한 줄만 전달됩니다</b>',
          d: '<code>panelcontent</code> 안에서 <b>첫 번째 텍스트</b>만 뽑아 한 줄로 내보냅니다. 표·버튼·이미지·여러 문단을 그려도 그 구조는 결과에 없습니다. <b>9장 탭과 반대</b>입니다 — 탭 본문은 그린 구조가 남지만 아코디언 본문은 문자열 하나로 줄어듭니다.',
        },
        {
          t: '모바일 치수 — 테두리·모서리 없이 흰 면',
          d: '아코디언은 <b>테두리도 모서리도 없고 배경만 흰색</b>입니다(PC는 1px 테두리 + 모서리 6, 패널마다 구분선). 제목 줄은 <b>높이 24 · 좌우 20 · 글자 16 Bold <code>#212B36</code></b>, 본문은 <b>위아래 12 · 좌우 20 · 글자 14 <code>#454F5B</code></b>이고 <b>제목과 본문 사이 10</b>, <b>패널 사이 20</b>입니다. 화살표는 <b>20 × 20</b>입니다.',
        },
        {
          t: '접힌 패널은 본문 없이 그립니다 · 화살표는 그려 둡니다',
          d: '<code>panelcontent</code>가 없는 패널은 <b>본문이 빈 채로</b> 나가고 오류가 아닙니다. <code>pnavi</code>와 화살표 아이콘은 결과에 <b>나가지 않지만 Figma에는 그립니다</b> — 위/아래 화살표로 <b>어느 패널이 펼쳐진 상태인지</b>를 인수자에게 전합니다.',
        },
      ],
    },
    pitfalls: [
      '<b>패널 본문은 텍스트 한 줄로 그립니다.</b> 표·버튼·여러 문단을 그려도 첫 텍스트 한 줄만 나가므로, 본문이 복잡한 화면에는 아코디언이 아니라 탭(9장)을 씁니다.',
      '<b>패널 프레임 이름의 두 번째 조각은 <code>panels</code>입니다</b>(완전일치). 다르게 지으면 패널로 잡히지 않아 제목·본문이 함께 빠집니다.',
      '<code>paneltitle</code>·<code>panelcontent</code>를 <b>패널의 직속 하위가 아닌 곳에 두면</b> 인식되지 않습니다.',
      '<b>제목 프레임에는 텍스트를 하나만 둡니다.</b> 여러 개면 첫 번째만 제목이 되고 부제·개수 배지는 사라집니다.',
      '<b>Figma에 테두리나 모서리를 그리지 않습니다.</b> 모바일 정본은 테두리 없는 흰 면이라 PC 모양을 그대로 옮기면 결과와 어긋납니다.',
    ],
    limits: [
      '본문에 텍스트 한 줄을 넘겨 담을 수 없습니다.',
      '펼쳐진 패널을 지정할 수 없습니다.',
      '여러 패널을 동시에 펼칠 수 있는지 여부를 지정할 수 없습니다.',
      '패널별 아이콘과 비활성 상태를 지정할 수 없습니다.',
    ],
    xmlOut: {
      note: '<b>변환 결과 XML은 PC와 동일합니다.</b> Figma 트리는 정본 XML보다 한 겹 깊지만(<code>pt_paneltitle &gt; ptx_textbox</code>) 변환기가 이를 정리해 <b>출력은 정본과 같아집니다.</b>',
      code: `<xf:group class="acdbox">
  <w2:accordion class="acd">
    <w2:panels>
      <w2:panelTitle label="Accordion 1"></w2:panelTitle>
      <w2:panelContent>
        <w2:textbox tagname="span" label="내용"></w2:textbox>
      </w2:panelContent>
    </w2:panels>
    <w2:panels>
      <w2:panelTitle label="Accordion 2"></w2:panelTitle>
      <w2:panelContent></w2:panelContent>
    </w2:panels>
    <w2:panels>
      <w2:panelTitle label="Accordion 3"></w2:panelTitle>
      <w2:panelContent></w2:panelContent>
    </w2:panels>
  </w2:accordion>
</xf:group>`,
      points: [
        '제목은 <code>&lt;w2:panelTitle&gt;</code>의 <code>label</code> 속성으로, 본문은 <code>&lt;w2:panelContent&gt;</code> 안 <b><code>&lt;w2:textbox&gt;</code> 한 줄</b>로 나갑니다.',
        '본문을 그리지 않은 패널은 <code>&lt;w2:panelContent&gt;</code>가 빈 채로 나갑니다.',
        '<code>pnavi</code>·화살표 레이어는 결과에 나가지 않습니다.',
        '<b>테두리 유무·간격 20·글자 16 같은 모바일 차이는 XML에 없습니다.</b> 전부 <code>base_mobile.css</code>가 정합니다.',
      ],
    },
  },

  /* ===================== 15장. 입력폼 ===================== */

  {
    chapter: 15, index: 1, id: 'form',
    name: '입력폼 (form)',
    summary: '입력 필드 여러 종류를 상태별로 모아 둔 표. 종류는 이름의 두 번째 조각이, 상태는 이름 어디에 있든 상태 단어가 정합니다. <b>모바일에서는 이 「항목 × 상태」 표가 표가 아니라 목록으로 그려집니다.</b>',
    capture: null,
    figmaNodeId: '15537:5656 (template_Mobile · x5 입력폼)',

    build: {
      tree: `if_group_tblbox
└ cond_table_w2tb tbl
   ├ row_tr_w2tb_tr             첫 행 — 상태 이름만 적은 제목 줄
   │  ├ lbl_th_w2tb_th          (빈 칸)
   │  ├ lbl_th_w2tb_th          "기본"
   │  ├ lbl_th_w2tb_th          "비활성"
   │  ├ lbl_th_w2tb_th          "읽기전용"
   │  ├ lbl_th_w2tb_th          "필수"
   │  └ lbl_th_w2tb_th          "에러"
   ├ row_tr_w2tb_tr             필드 한 종류가 한 행
   │  ├ lbl_th_w2tb_th
   │  │  └ head_textbox         "인풋" — 행 제목 (모바일에서 그룹 제목이 됩니다)
   │  ├ field_td_w2tb_td
   │  │  └ f_input_base         2번째 조각 "input" → 인풋 · 높이 48 · 모서리 8 · 글자 16
   │  ├ field_td_w2tb_td
   │  │  └ f_input_disabled     이름에 "disabled" → 비활성
   │  ├ field_td_w2tb_td
   │  │  └ f_input_readonly     이름에 "readonly" → 읽기전용
   │  ├ field_td_w2tb_td
   │  │  └ f_input_req          이름에 "req" → 필수
   │  └ field_td_w2tb_td
   │     └ f_input_error        이름에 "error" → 에러
   └ row_tr_w2tb_tr × N         secret · textarea · select · searchbox · inputcalendar ·
                                spinner · autocomplete · checkcombobox · upload · 체크박스 · 라디오 …`,
      points: [
        {
          t: '필드 종류는 두 번째 조각이 정합니다 — PC와 같습니다',
          d: '<code>f_input_base</code>의 <code>input</code>처럼 두 번째 조각이 컴포넌트 이름입니다(2장). <b>이름 규칙은 모바일에서도 그대로</b>이므로 이 장에서 새로 볼 것은 <b>모바일 치수와 화면 배치</b>뿐입니다.',
        },
        {
          t: '상태는 이름 어디에 있어도 걸립니다',
          d: '이름을 <code>_</code>·공백으로 쪼갠 조각 중에 상태 단어가 있으면 그 상태가 됩니다 — <code>disabled</code>(<code>dis</code>) · <code>readonly</code>(<code>ro</code>) · <code>req</code>(<code>required</code>) · <code>error</code>(<code>err</code>). <b>조각 단위 완전일치</b>라 <code>disabled2</code>·<code>nodisabled</code>는 안 걸립니다.',
        },
        {
          t: '모바일 필드 치수 — <b>높이 48 · 모서리 8 · 글자 16 · 폭 335</b>',
          d: '모든 폼 필드는 높이 <b>48</b>, 모서리 <b>8</b>, 좌우 여백 <b>12</b>, 글자 <b>16 Regular</b>(줄 높이 24), 우측 아이콘 <b>20 × 20</b>, 폭 <b>335(FILL)</b>입니다(PC는 24 / 2 / 12). <b>여러 줄 입력칸만 예외</b>로 높이 96 · 여백 6 12 · 글자 14입니다. 상태별 색은 기본 테두리 <code>#DDDDDD</code>, 포커스 <code>#AAAAAA</code>(1px), 비활성 배경 <code>#EEEEEE</code>·글자 <code>#AAAAAA</code>, 에러 테두리 <code>#CF1322</code>, 필수 배경 <code>#ECF2FE</code>입니다. 체크박스·라디오 상자는 <b>20 × 20</b>(체크 모서리 4 · 라디오 원형), 미선택 테두리 <code>#E6E8EA</code>, 선택 <code>#237AF3</code>, 라벨은 14 Medium <code>#212B36</code>이고 상자와 6 띄웁니다.',
        },
        {
          t: '<b>모바일 전용 — 「항목 × 상태」 표는 목록으로 바뀝니다</b>',
          d: '이 화면처럼 <b>첫 행이 통째로 제목 줄(값칸이 없는 행)</b>인 표는 모바일에서 표가 아니라 <b>목록</b>으로 그려집니다. <b>행 제목(인풋·secret …)이 그룹 제목으로 올라가고</b>(파란 사각 + 15 Bold <code>#212B36</code>), 그 아래로 필드가 <b>세로로 쌓입니다.</b> 그룹 사이 16 · 필드 사이 20입니다. <b>상태 이름 줄(기본/비활성/읽기전용/필수/에러)은 화면에서 숨깁니다</b> — 각 필드 위에 붙일 수 없어 제목 바로 아래에 라벨 다섯 개가 떠 있는 꼴이 되기 때문입니다. 필드마다 라벨을 보이게 하려면 <b>값칸마다 라벨 칸을 짝지어 그려야</b> 합니다.',
        },
        {
          t: '필드를 가로로 나열할 때는 <b>한 줄에 최대 3개</b>',
          d: '필드를 가로로 늘어놓는 나열 컨테이너(<code>etcbox flex</code>)에서는 <b>한 줄에 3개까지</b>이고 <b>4개째부터 다음 줄로 내려갑니다.</b> 한 줄에 5개를 두면 예전에는 각 64px로 쭈그러들었습니다. 마지막 줄은 남는 폭을 나눠 가지므로 3 + 2로 떨어집니다. <b>버튼·트리거·체크박스·라디오·라벨·링크는 이 규칙에서 빠집니다</b>(아이콘 버튼 16개를 늘어놓는 행이 정상이기 때문). Figma에서도 <b>한 줄에 필드 4개 이상을 그리지 않습니다.</b>',
        },
      ],
    },
    pitfalls: [
      '<b>셀렉트·멀티셀렉트·체크박스·라디오·업로드는 비활성(<code>disabled</code>)으로 잠급니다.</b> 이 다섯은 이름에 <code>readonly</code>를 적어도 결과에 나가지 않습니다.',
      '<b>상태를 색으로만 표현하지 않습니다.</b> 회색으로 칠하거나 빨간 테두리를 그려도 전달되지 않습니다 — 상태는 이름의 단어로만 갑니다.',
      '<b>필드에 클래스를 붙여 모양을 바꾸려 하지 않습니다.</b> 폼 필드는 이름의 클래스 자리가 결과에 나가지 않습니다(<code>req</code>·<code>error</code>만 예외).',
      '<b>셀렉트 종류를 구분하려면 그 단어를 이름에 남깁니다</b> — <code>f_selectnative_base</code>·<code>f_selectsel_base</code>. 둘 다 <code>select</code>로만 지으면 같은 기본 셀렉트가 됩니다.',
      '<b>필드 폭을 Figma에서 맞추려 하지 않습니다.</b> 모바일에서는 값칸 안 필드가 남는 폭을 나눠 갖도록 CSS가 다시 정합니다 — 원본 XML에 박힌 PC 폭(120·148 등)도 화면에서는 무시됩니다.',
      '<b>라벨 글자가 길면 필드 위로 넘쳐 겹칩니다.</b> 공백 없는 한 단어(<code>YearMonthDateSec</code> 같은 것)는 라벨 상자 밖까지 그려지던 문제가 있어 <b>상자 안에서 두 줄로 접히도록</b> 고쳤습니다. 라벨은 되도록 짧게 씁니다.',
    ],
    limits: [
      '필드에 자체 클래스를 붙여 모양을 바꿀 방법이 없습니다(<code>req</code>·<code>error</code>만 예외).',
      '셀렉트·멀티셀렉트·체크박스·라디오·업로드에 읽기전용을 지정할 방법이 없습니다.',
      '체크박스·라디오는 항목 텍스트만 모이고 어느 항목이 선택된 상태인지 전달할 방법이 없습니다.',
      '입력값의 형식(숫자·전화번호·자릿수 제한 등)을 전달할 방법이 없습니다.',
      '<b>상태 이름 줄을 화면에 살릴 방법이 지금은 없습니다.</b> 값칸마다 라벨 칸을 짝지어 그리는 구조로 바꿔야 합니다.',
    ],
    xmlOut: {
      note: '<b>변환 결과 XML은 PC와 동일합니다.</b> 인풋 한 행의 다섯 상태만 뽑았습니다. 필드 종류마다 붙는 속성이 달라 다른 종류는 결과 모습도 다릅니다.',
      code: `<!-- 기본 -->
<xf:input placeholder="" style="width:100%;"></xf:input>

<!-- 비활성 -->
<xf:input placeholder="" disabled="true" style="width:100%;"></xf:input>

<!-- 읽기전용 -->
<xf:input placeholder="" readOnly="true" style="width:100%;"></xf:input>

<!-- 필수 -->
<xf:input placeholder="" class="req" style="width:100%;"></xf:input>

<!-- 에러 -->
<xf:input placeholder="" class="error" style="width:100%;"></xf:input>`,
      points: [
        '<b>비활성·읽기전용은 속성</b>(<code>disabled</code>·<code>readOnly</code>)이고 <b>필수·에러는 클래스</b>입니다 — 넷이 같은 자리로 가지 않습니다.',
        '<code>f_input_base</code>의 <code>base</code>는 결과에 없습니다 — 폼 필드는 이름의 클래스를 쓰지 않습니다.',
        '<b>높이 48·모서리 8·글자 16은 XML에 없습니다.</b> 같은 XML을 PC로 열면 24 / 2 / 12로 보입니다 — 차이는 전부 CSS가 만듭니다.',
        '<b>「표가 목록이 된다」·「한 줄에 3개」도 XML에 없습니다.</b> 마크업 구조만 보고 모바일 CSS가 판단합니다.',
      ],
    },
  },

  {
    chapter: 15, index: 2, id: 'form-etc',
    name: '기타 위젯 (form-etc)',
    summary: '토글·페이지컨트롤·진행바·날짜선택기·슬라이더. <b>속을 그려도 결과에 반영되지 않는</b> 위젯들이며, 모바일에서는 토글 두 종류의 치수가 크게 바뀌었습니다.',
    capture: null,
    figmaNodeId: '(모바일 미확정 — 기타 위젯 전용 노드 id 미확인. 기준 = 입력폼과 같은 15537:5656 · 컴포넌트 <code>Form/ToggleSwitch</code> 15537:6539 · <code>Form/FlipToggle</code> 15382:2818 · <code>Form/ProgressBar</code> 15397:42260 · <code>slider</code> 15397:42243)',

    build: {
      tree: `etc_group_tblbox
└ etc_table_w2tb tbl
   ├ row_tr_w2tb_tr
   │  ├ field_td_w2tb_td
   │  │  └ flip_fliptoggle       2번째 조각 "fliptoggle" — 트랙 60 × 28 · 모서리 20 · 노브 22
   │  │     └ off_textbox        (속 — 결과에 반영되지 않습니다)
   │  └ field_td_w2tb_td
   │     └ page_pageControl      2번째 조각 "pageControl"
   │        ├ pc_prev            (속 — 반영되지 않습니다)
   │        ├ pc_center
   │        └ pc_next
   ├ row_tr_w2tb_tr
   │  ├ field_td_w2tb_td
   │  │  └ prog_group_flex       한 칸에 둘을 나란히 두려고 flex 그룹으로 묶었습니다
   │  │     ├ prog_progressbar type1
   │  │     └ prog_progressbar type2
   │  └ field_td_w2tb_td
   │     └ date_datePicker       2번째 조각 "datePicker"
   │        ├ DatePicker/Year    (속 — 반영되지 않습니다)
   │        ├ DatePicker/Month
   │        └ DatePicker/Day
   └ row_tr_w2tb_tr
      └ field_td_w2tb_td
         └ sl_slider             2번째 조각 "slider" — 하위 항목 없이 막대 하나`,
      points: [
        {
          t: '다섯 위젯 모두 <b>속이 반영되지 않습니다</b>',
          d: '토글의 ON/OFF 글자, 페이지컨트롤의 화살표, 날짜선택기의 연·월·일 칸을 그려도 결과에는 <b>위젯 태그 하나</b>만 나갑니다. 실제 모양은 프레임워크가 그립니다. <b>PC와 같은 규칙입니다.</b>',
        },
        {
          t: '이름의 두 번째 조각만 맞추면 됩니다',
          d: '<code>fliptoggle</code> · <code>pageControl</code> · <code>progressbar</code> · <code>datePicker</code> · <code>slider</code>를 쓰고 대소문자는 가리지 않습니다(2장).',
        },
        {
          t: '<b>그리는 기준선 — 외형 한 겹</b>',
          d: '속은 나가지 않지만 빈 프레임으로 두면 화면에서 무슨 위젯인지 알 수 없습니다. <b>템플릿도 외형 한 겹만 그려 두었습니다</b> — 토글은 글자 하나, 페이지컨트롤은 이전·가운데·다음 세 칸, 진행바는 막대와 라벨, 날짜선택기는 연·월·일 세 칸, 슬라이더는 <b>하위 항목 없이 막대 하나</b>입니다.',
        },
        {
          t: '<b>모바일 토글 치수가 바뀌었습니다</b>',
          d: '토글 스위치는 <b>트랙 52 × 28 · 모서리 20 · 노브 22</b>(좌우 여백 3, 켜지면 노브가 오른쪽으로), 플립 토글은 <b>트랙 60 × 28 · 모서리 20 · 노브 22</b>입니다. 사양문서 §5-5에는 아직 <b>트랙 40 × 20 · 노브 14</b>라는 <b>옛 값</b>이 남아 있습니다 — 정본 컴포넌트를 다시 재어 올린 값이 현행이고 CSS도 그 값입니다. 상태 색은 꺼짐 흰 트랙(테두리 <code>#CFD5D8</code>) · 켜짐 <b><code>#237AF3</code></b> · 비활성 <code>#C4CDD5</code>입니다.',
        },
        {
          t: '토글은 <b>항목 한 개 · 라벨은 빈 문자열</b>로 그립니다',
          d: '정본 토글은 전부 <b>항목이 1개</b>이고 라벨이 비어 있습니다. 항목을 두 개(Atype/Btype) 넣으면 <b>스위치가 겹칩니다.</b> 항목이 하나뿐이라 <code>selectedindex="0"</code>이 곧 <b>켜짐</b>입니다.',
        },
        {
          t: '진행바만 <code>type1</code>·<code>type2</code>로 모양이 갈립니다',
          d: '<code>prog_progressbar type1</code>처럼 이름에 종류를 씁니다. 한 칸에 둘을 나란히 두려면 <b><code>flex</code> 그룹으로 묶습니다.</b> 진행률·현재 페이지·슬라이더 위치 같은 <b>값은 그려도 나가지 않습니다.</b>',
        },
      ],
    },
    pitfalls: [
      '<b>토글·날짜선택기는 외형 한 겹까지만 그립니다.</b> 속은 결과에 반영되지 않습니다.',
      '<b>토글에 항목을 두 개 넣지 않습니다.</b> 스위치가 겹쳐 그려집니다 — 항목 1개 · 라벨 빈 문자열이 정본입니다.',
      '<b>진행바는 이름에 종류를 씁니다.</b> 두 번째 모양은 <code>type2</code>이고, 안 쓰면 <code>type1</code>이 됩니다.',
      '한 칸에 위젯을 둘 이상 둘 때 <b><code>flex</code> 그룹으로 묶지 않으면</b> 가로로 놓이지 않습니다.',
      '<b>토글 치수는 정본 문서(§5-5)와 CSS가 어긋납니다.</b> 문서의 40 × 20 · 노브 14는 옛 값이고, <b>화면에 나오는 값은 52 × 28 · 노브 22</b>입니다.',
      '<b>비활성 토글이 파랗게 보이면 CSS 탓이 아닐 수 있습니다.</b> 실서버에서는 다른 스타일시트가 뒤에 얹혀 「켜짐 = 파랑」 규칙이 이기던 사례가 있었습니다.',
    ],
    limits: [
      '진행률·현재 페이지·슬라이더 값은 지정할 수 없습니다.',
      '토글의 ON/OFF 글자는 바꿀 수 없습니다.',
      '날짜선택기의 표시 단위는 지정할 수 없습니다.',
      '진행바를 뺀 네 위젯은 종류·형태 변형이 없습니다.',
    ],
    xmlOut: {
      note: '<b>변환 결과 XML은 PC와 동일합니다.</b> 다섯 위젯 모두 하위 항목 없이 태그 하나로 나가고 속성은 변환기가 정합니다.',
      code: `<xf:group tagname="td" class="w2tb_td">
  <w2:fliptoggle style="width:100%;"></w2:fliptoggle>
</xf:group>
<xf:group tagname="td" class="w2tb_td">
  <w2:pageControl style="width:100%;"></w2:pageControl>
</xf:group>
<xf:group tagname="td" class="w2tb_td">
  <xf:group class="flex">
    <w2:progressBar skin="type1" …></w2:progressBar>
    <w2:progressBar skin="type2" …></w2:progressBar>
  </xf:group>
</xf:group>
<xf:group tagname="td" class="w2tb_td">
  <w2:datePicker …></w2:datePicker>
</xf:group>
<xf:group tagname="td" class="w2tb_td">
  <w2:slider …></w2:slider>
</xf:group>`,
      points: [
        '하위 항목이 나가지 않습니다 — 그린 속이 결과에 반영되지 않는다는 뜻입니다.',
        '<code>flex</code> 그룹은 <code>class="flex"</code>로 나가 한 칸에 위젯 둘을 가로로 두는 역할을 유지합니다.',
        '진행바만 <code>skin</code>으로 종류가 갈리고 나머지 넷은 종류 구분이 없습니다.',
        '<b>토글 트랙 52 × 28 같은 치수는 XML에 없습니다.</b> 같은 XML을 PC로 열면 다른 크기로 보입니다.',
      ],
    },
  },

  {
    chapter: 15, index: 3, id: 'form-combo',
    name: '입력폼(조합형) (form-combo)',
    summary: '한 칸에 요소를 여러 개 나란히 두는 구조. <b>인풋의 잰 폭이 결과에 실리는 유일한 경우</b>이며, 구분자도 하나의 요소로 그립니다.',
    capture: null,
    figmaNodeId: '(모바일 미확정 — 조합형 전용 노드 id 미확인. 후보 = template_Mobile t11 15395:37300 · t12 15396:37511 [XML#10])',

    build: {
      tree: `cif_group                  (섹션 묶음 — 클래스 없음)
├ title_group_titbox
│  ├ title_bar                     (장식 — 매핑 안 됨)
│  └ title_textbox_tit_main        "입력폼(조합형)"
└ cif_group_tblbox
   └ cif_table_w2tb tbl
      ├ row_tr_w2tb_tr             상태 이름만 적은 제목 줄
      ├ row_tr_w2tb_tr             버튼 + 인풋을 한 칸에
      │  ├ lbl_th_w2tb_th
      │  ├ field_td_w2tb_td        칸 안 요소 사이 간격 8
      │  │  ├ sb_button_btn_cm search icon    48 × 48 (정사각 — 늘어나지 않습니다)
      │  │  └ in_input             ← 칸에 요소가 둘이라 잰 폭이 XML에 실립니다(5.4)
      │  └ field_td_w2tb_td
      │     ├ sb_button_btn_cm search icon
      │     └ in_input_disabled
      └ row_tr_w2tb_tr             입력달력 + 구분자 + 입력달력
         ├ lbl_th_w2tb_th
         ├ field_td_w2tb_td
         │  ├ ic_inputcalendar
         │  ├ sep_textbox          "~" ← 구분자도 하나의 요소로 그립니다
         │  └ ic_inputcalendar
         └ field_td_w2tb_td
            ├ ic_inputcalendar_disabled
            ├ sep_textbox
            └ ic_inputcalendar_disabled`,
      points: [
        {
          t: '<b>칸에 요소가 둘 이상이면 인풋에 잰 폭이 실립니다</b>',
          d: '5.2의 규칙이 적용되는 항목입니다. 인풋은 칸에 혼자 있으면 <code>width:100%</code>지만 <b>다른 요소와 함께 있으면 Figma에서 잰 폭</b>이 나갑니다. <b>입력달력의 120px은 잰 값이 아니라 고정값</b>이라 혼자 있어도 같습니다.',
        },
        {
          t: '<b>모바일 전용 — 실린 폭이 화면에는 나타나지 않습니다</b>',
          d: 'XML에는 <code>width:148px</code>이 그대로 실리지만, <b>모바일 CSS는 값칸 안 필드를 「남는 폭 나눠 갖기」로 다시 정합니다.</b> 그래서 한 칸에 필드가 하나면 꽉 차고, 둘이면 <b>한 줄에서 반씩</b> 나눠 갖습니다(줄바꿈 없음). 구분자(<code>~</code>·<code>@</code>)와 버튼은 나눠 갖기에서 빠져 <b>제 크기 그대로</b>입니다. 요소 사이 간격은 <b>8</b>입니다. <b>Figma에서 폭을 정교하게 맞춰도 모바일 화면은 달라지지 않습니다</b> — 그 값은 PC용입니다.',
        },
        {
          t: '구분자는 텍스트 요소로 그립니다',
          d: '기간의 <code>~</code>나 이메일의 <code>@</code>는 <code>sep_textbox</code>처럼 <b>텍스트 컴포넌트</b>로 그립니다. 그 글자가 결과에 나가 필드 사이에 놓입니다. 칸의 여백이나 배경으로 표현하면 나가지 않습니다.',
        },
        {
          t: '버튼도 같은 칸에 둡니다',
          d: '조회 버튼이 붙는 입력칸은 <b>버튼과 인풋을 같은 칸에</b> 둡니다. 버튼은 13장 규칙을 따르므로 아이콘 전용이면 <code>icon</code> 토큰을 붙이고 텍스트 자식을 두지 않습니다. <b>모바일에서 칸 안 아이콘 버튼은 48 × 48 정사각</b>이고 폭이 늘어나지 않습니다 — 필드 높이 48과 줄이 맞습니다.',
        },
        {
          t: '순서는 레이어 순서 · 상태는 요소마다 따로',
          d: '칸 안 배치 순서는 <b>레이어 패널 순서</b>가 정합니다(4장) — 캔버스 위치가 아닙니다. 칸 전체를 비활성으로 하려면 <b>칸 안 요소 각각의 이름에</b> <code>disabled</code>를 씁니다. 칸이나 행에 써도 하위 요소에 내려가지 않습니다.',
        },
      ],
    },
    pitfalls: [
      '<b>그린 폭을 결과에 내보내려면 인풋을 다른 요소와 같은 칸에 둡니다</b>(5.4). 혼자 있으면 <code>width:100%</code>가 되고, <b>인풋 말고 다른 필드는 이 방법으로도 폭이 실리지 않습니다.</b>',
      '<b>다만 그 폭은 모바일 화면에는 보이지 않습니다.</b> PC로도 볼 화면이면 의미가 있고, 모바일 전용 화면이면 폭 맞추기에 시간을 쓰지 않습니다.',
      '<b>비활성은 칸이나 행 이름에 쓰지 않습니다.</b> 하위 요소로 내려가지 않으므로 요소마다 따로 씁니다.',
      '<b>구분자는 텍스트 레이어로 그립니다.</b> 여백·배경으로 표현하면 결과에 나가지 않습니다.',
      '<b>칸 안 요소 순서는 레이어 순서로 맞춥니다.</b> 결과는 캔버스 위치를 보지 않습니다.',
      '<b>이 표도 모바일에서는 목록으로 바뀝니다</b>(15.1과 같은 「항목 × 상태」 표). 행 제목이 그룹 제목으로 올라가고 상태 이름 줄은 숨겨집니다.',
    ],
    limits: [
      '칸 안 요소 사이 간격은 CSS가 정합니다(모바일 8).',
      '인풋 폭은 Figma에서 잰 값이 px로 나가므로 <b>퍼센트나 최소·최대 폭으로는 지정할 수 없고</b>, 모바일 화면에서는 그 값이 쓰이지 않습니다.',
      '15.1의 제약이 그대로 적용됩니다 — 필드 클래스 미반영, 일부 필드의 읽기전용 미지원, 상태 이름 줄 숨김.',
    ],
    xmlOut: {
      note: '<b>아래 예시는 PC 기준 값입니다</b> — 한 칸에 요소가 여럿일 때 폭이 어떻게 실리는지 확인하는 용도입니다. <b>모바일 단말로 변환하면 <code>style</code> 한 칸이 다릅니다</b>(16.1) — 칸에 필드가 하나면 <code>width:100%;</code>, 둘 이상이면 <code>flex:1 1 0;min-width:0</code>이 나갑니다. 나머지 속성과 구조는 PC와 동일합니다.',
      code: `<!-- 버튼 + 인풋 -->
<xf:group tagname="td" class="w2tb_td">
  <w2:button class="btn_cm search icon">
    <w2:textbox tagname="span" label=""></w2:textbox>
  </w2:button>
  <xf:input style="width:148px;"></xf:input>
</xf:group>

<!-- 입력달력 ~ 입력달력 (비활성) -->
<xf:group tagname="td" class="w2tb_td">
  <w2:inputCalendar … disabled="true" style="width: 120px;"></w2:inputCalendar>
  <w2:textbox label="~"></w2:textbox>
  <w2:inputCalendar … disabled="true" style="width: 120px;"></w2:inputCalendar>
</xf:group>`,
      points: [
        '<b>인풋에 <code>width:148px</code>이 나갔습니다.</b> 칸에 요소가 둘이라 <code>width:100%</code>가 적용되지 않은 결과이고, 잰 폭이 나가는 경우는 이 조건뿐입니다(5.4). <b>이 값은 단말과 무관합니다</b> — 인풋은 한 칸에 요소가 여럿이어도 <b>잰 폭이 그대로 나갑니다</b>(<code>ConvertedCodeEditor.tsx:967~981</code>). 옆의 셀렉트·입력달력이 남는 폭을 채워 나란히 놓이게 하려는 것이라, <b>바로 아래 입력달력과 규칙이 다릅니다.</b> 화면에서 이 폭이 보이지 않는 것은 세 번째 항목의 CSS 때문이고 <b>XML 출력과는 다른 층위</b>입니다.',
        '<b>입력달력의 <code>width: 120px</code>도 PC 기준 값입니다.</b> 잰 값이 아니라 PC에서 붙는 고정값이고, <b>모바일 단말 변환에서는 이 값이 나가지 않습니다</b>(16.1) — 칸에 혼자면 <code>width:100%;</code>, 둘 이상이면 위와 같이 <code>flex:1 1 0;min-width:0</code>입니다.',
        '<b>이 두 px 값은 모바일 화면에서 쓰이지 않습니다.</b> 모바일 CSS가 값칸 안 필드를 남는 폭 나눠 갖기로 바꾸기 때문입니다 — <b>같은 XML이 PC에서는 148 / 120으로 보입니다.</b>',
        '구분자는 <code>&lt;w2:textbox label="~"&gt;</code>로 필드 사이에 나갑니다.',
        '<code>disabled="true"</code>가 입력달력마다 따로 나갑니다 — 칸이 아니라 요소마다 지정해야 하는 근거입니다.',
      ],
    },
  },



  /* ===================== 16장. 달력 ===================== */

  {
    chapter: 16, index: 1, id: 'cal-input',
    name: '날짜 입력칸 (inputcalendar)',
    summary: '칸 안에 두는 날짜 입력 요소. 모바일에서는 <b>높이 48짜리 폼 필드</b>가 되고 <b>폭은 칸을 채웁니다</b>(PC의 120px 고정과 다릅니다). 누르면 달력이 <b>화면 가로 한가운데</b>에 뜹니다.',
    capture: null,
    figmaNodeId: '(모바일 미확정 — <code>template_Mobile</code>에 <code>InputCalendar</code> 블록이 아직 없습니다. 「정본엔 있는데 아직 안 만든 것」 목록에 올라 있습니다 · 마스터는 <code>Form/InputCalendar</code> 15382:2698)',

    build: {
      tree: `fld_td_w2tb_td                      값칸 — 표 작성 규칙은 15장
└ ic_inputcalendar                  두 번째 조각 "inputcalendar"
                                    335 × 48 · 하위 레이어 없음

  ── 기간(날짜 ~ 날짜)이면 한 칸에 셋을 넣습니다 ──
fld_td_w2tb_td
├ from_inputcalendar                154
├ sep_textbox                       "~"
└ to_inputcalendar                  154        (좌우 간격 8)`,
      points: [
        {
          t: '크기는 폼 필드 공통 규격을 씁니다',
          d: '높이 <b>48</b> · 모서리 <b>8</b> · 좌우 여백 <b>12</b> · 글자 <b>16</b>입니다(사양문서 §5-4). PC는 높이 24 · 모서리 2 · 글자 12라 <b>거의 두 배</b>입니다. 15장의 다른 필드와 같은 값이므로 한 줄에 섞여도 높이가 맞습니다.',
        },
        {
          t: '달력 아이콘은 20, 아이콘 칸은 32입니다',
          d: '필드 안 아이콘은 <b>20 × 20</b>이고(사양문서 §6 「폼 필드 안 20」), 아이콘이 앉는 칸은 <b>32</b>(= 여백 12 + 아이콘 20)입니다. 글자가 아이콘 밑으로 들어가지 않도록 입력 영역 오른쪽에 <b>40</b>을 비웁니다(<code>base_mobile.css:283~288</code>). <b>아이콘은 CSS가 그리므로 Figma에서 그려도 결과에 나가지 않습니다</b> — 다만 필드 모양을 알아보게 그려 둡니다.',
        },
        {
          t: '<b>모바일 함정 — 폭이 PC와 다릅니다</b>',
          d: 'PC는 Figma에서 잡아 둔 고정폭(없으면 <code>width: 120px</code>)이 그대로 나가지만, <b>모바일 단말로 변환하면</b> 칸에 필드가 하나일 때 <code>width:100%;</code>, 둘 이상일 때 <code>flex:1 1 0;min-width:0</code>이 나갑니다(<code>ConvertedCodeEditor.tsx:533~556 · 921</code>). 게다가 <b>어느 쪽이 나가든 모바일 CSS가 값칸 안 필드를 「남는 폭 나눠 갖기」로 다시 정합니다</b>(<code>base_mobile.css:653~663</code>). <b>Figma에서 폭을 정교하게 맞춰도 모바일 화면은 달라지지 않습니다.</b>',
        },
        {
          t: '<b>기간은 한 칸에 셋을 넣습니다</b>',
          d: '정본 날짜범위(<code>15386:28338</code>)는 <b>날짜칸 154 + <code>~</code> + 날짜칸 154</b>이고 요소 사이 간격은 <b>8</b>입니다(<code>base_mobile.css:1508</code>). 구분자 <code>~</code>는 <b>텍스트 레이어</b>로 그립니다 — 여백이나 배경으로 표현하면 결과에 나가지 않습니다(15.3).',
        },
        {
          t: '누르면 뜨는 달력은 <b>화면 가로 한가운데</b>입니다',
          d: '팝업 달력은 화면 본문 밖(<code>body</code> 직속)에 뜨고 폭이 <b>335</b>라, 인풋 위치를 따라가면 오른쪽으로 최대 196px 화면 밖으로 나갔습니다. 그래서 <b>가로 위치를 화면 한가운데로 고정</b>했습니다 — <b>좌 20 / 우 355</b>로 다른 블록의 20 라인과 맞습니다(<code>base_mobile.css §22</code>, 실서버 13개 전수 실측).',
        },
        {
          t: '상태는 폼 필드 공통 규칙을 따릅니다',
          d: '<code>disabled</code> · <code>readonly</code> · <code>req</code> · <code>error</code> 네 가지를 이름에 이어 씁니다. 지정 방식과 결과 형태는 15.1과 같습니다. <b>필수 표시는 모바일에서 라벨 앞 별표 <code>*</code></b>입니다(PC는 파란 점, 사양문서 §5-3).',
        },
      ],
    },
    pitfalls: [
      '<b>칸 안 날짜 입력에 <code>calendar</code>를 쓰지 않습니다.</b> 그 자리에 폭 335짜리 달력이 통째로 펼쳐집니다(16.2).',
      '<b>폭 맞추기에 시간을 쓰지 않습니다.</b> 모바일에서는 잰 폭도 <code>120px</code>도 화면에 나타나지 않습니다.',
      '<b>팝업 달력이 인풋 바로 아래에 뜨지 않을 수 있습니다 — 결함이 아닙니다.</b> 세로 위치는 엔진이 「아래 공간이 부족하면 위로」 계산해 직접 박습니다. CSS는 인풋 위치를 알 수 없어 대체할 수 없고, <b>지금 상태로 두기로 결정</b>했습니다(<code>base_mobile.css §22</code>). 화면 하단의 날짜칸을 누르면 달력이 <b>위로</b> 뜹니다.',
      '<b>날짜 단위와 <code>native</code>는 이 컴포넌트에 지정할 수 없습니다.</b> 이름에 써도 결과가 바뀌지 않습니다 — 단위 지정은 펼친 달력(16.2 · 16.3)에만 있습니다.',
      '<b>달력 아이콘을 자식 레이어로 그려도 결과에 나가지 않습니다.</b> 오히려 그 자식이 다시 날짜 입력으로 잡혀 중첩되는 것을 막으려고 변환기가 자식을 통째로 무시합니다.',
      '<b>배포 갭 — 남들이 쓰는 배포본 변환기에는 이 분기가 아직 없습니다.</b> 낡은 배포본으로 변환하면 날짜 입력칸이 그냥 그룹으로 나갑니다(<code>figma-mobile-xml정합_인수인계.md §8-1</code>의 「구버전에 아예 없는 분기 19종」에 <code>inputcalendar</code>가 들어 있습니다). 변환이 안 되면 디자인이 아니라 <b>변환기 판본</b>을 먼저 확인합니다.',
    ],
    limits: [
      '날짜 단위(연·월만, 초까지 등)를 지정할 방법이 없습니다 — <code>yearMonthDate</code> 고정입니다.',
      '기본값 · 선택 가능 범위 · 공휴일 표시를 지정할 방법이 없습니다.',
      '브라우저 기본형(<code>native</code>)으로 전환할 방법이 없습니다.',
      '<b>팝업 달력의 세로 위치를 지정할 방법이 없습니다.</b> 가로만 CSS로 한가운데 고정했고 세로는 엔진 소관입니다.',
    ],
    xmlOut: {
      note: '<b>모바일 단말로 변환하면 <code>style</code> 한 칸만 PC와 다릅니다.</b> 나머지 속성은 PC와 동일합니다.',
      code: `<!-- 칸에 혼자 있을 때 (모바일) -->
<w2:inputCalendar calendarValueType="yearMonthDate" focusOnDateSelect="false"
  footerDiv="true" renderDiv="true" renderType="" rightAlign="false"
  style="width:100%;"></w2:inputCalendar>

<!-- 한 칸에 둘 이상 — 날짜 ~ 날짜 (모바일) -->
<xf:group tagname="td" class="w2tb_td">
  <w2:inputCalendar … style="flex:1 1 0;min-width:0"></w2:inputCalendar>
  <w2:textbox label="~"></w2:textbox>
  <w2:inputCalendar … style="flex:1 1 0;min-width:0"></w2:inputCalendar>
</xf:group>

<!-- 비활성 -->
<w2:inputCalendar … disabled="true" style="width:100%;"></w2:inputCalendar>`,
      points: [
        '<code>calendarValueType="yearMonthDate"</code>와 <code>renderType=""</code>는 <b>고정 출력</b>입니다. 이름에 무엇을 써도 이 값입니다.',
        '<b><code>style</code>만 단말에 따라 갈립니다</b> — PC는 Figma 고정폭 또는 <code>width: 120px</code>, 모바일은 <code>width:100%;</code> 또는 <code>flex:1 1 0;min-width:0</code>입니다.',
        '<b>15.3이 싣고 있는 <code>width: 120px</code>은 PC 기준 정본 XML의 값입니다.</b> 위 「완성 모습」 조각도 그 정본 XML을 그대로 렌더한 것이라 화면 소스에는 120이 보입니다 — <b>어느 쪽이든 모바일 CSS가 폭을 다시 정하므로 화면은 같습니다.</b>',
        '자식이 없습니다 — 달력 아이콘을 그려도 결과 구조에 포함되지 않습니다.',
        '<code>disabled="true"</code>는 요소마다 따로 나갑니다. 칸이나 행에 써도 하위로 내려가지 않습니다(15.3).',
      ],
    },
  },

  {
    chapter: 16, index: 2, id: 'cal-open',
    name: '펼친 달력 (calendar)',
    summary: '날짜를 고르는 달력을 화면에 펼쳐 놓은 형태. 모바일에서는 폭 <b>335</b> · 모서리 <b>16</b>이고, <b>주말도 평일과 같은 색</b>으로 그리며 요일은 한글입니다.',
    capture: null,
    figmaNodeId: '마스터 <code>Mobile/Calendar</code> 15397:41496 (ym · ymd 두 변형) · 배치는 <code>template_Mobile</code> x5 입력폼 15537:5656 안 <code>cal_group_etcbox</code>',

    build: {
      tree: `cal_group_etcbox                375 · padding 0 20
└ cw_calendar_yearMonthDate     두 번째 조각 "calendar" → 펼친 달력
                                세 번째 조각은 변형 지정자입니다
                                335 · 모서리 16 · 그림자 없음

  ── 달력 안쪽(결과에는 안 나가지만 알아보게 그립니다) ──
  ├ cal_header                  335 × 64 · padding 8 16 · gap 4 · 왼쪽부터
  │  ├ nav_prev                 48 × 48 · 모서리 8 · 테두리 #C4CDD5 · 화살표 20
  │  ├ sel_year                 높이 48 · 모서리 6 · 테두리 #DDDDDD · 글자 16
  │  ├ sel_month                (년·월이 남는 폭을 반씩 나눠 갖습니다)
  │  └ nav_next                 48 × 48
  ├ cal_days                    요일 한 줄 — 한글, 글자 14, 전부 #333333
  └ cal_footer                  335 × 68 · padding 4 16 16
     ├ cal_today                69 × 48 · 모서리 6 · 16 Medium · #237AF3
     └ cal_date_text            14 · #454F5B`,
      points: [
        {
          t: '<b>세 번째 조각은 클래스가 아니라 변형 지정자입니다</b>',
          d: '<code>calendar</code> · <code>slider</code> · <code>datepicker</code> 류는 이름의 세 번째 조각이 <b>변형 지정자</b>입니다(<code>yearMonthDate</code> · <code>native</code> 등). <b>여기에 CSS 클래스를 적으면 결과가 정본과 어긋납니다</b>(사양문서 §2).',
        },
        {
          t: '단위는 이름 전체에서, 긴 것부터 판정합니다',
          d: '변환기는 조각을 나누지 않고 <b>이름 전체를 소문자로 바꿔 포함 여부</b>를 봅니다. 값은 여섯 가지입니다 — <code>yearMonthDateTimeSec</code> · <code>yearMonthDateTime</code> · <code>yearMonthDateHour</code> · <code>yearMonthDate</code> · <code>yearMonth</code> · <code>year</code>. <b>아무것도 없으면 연·월·일</b>입니다. 판정은 <b>긴 값부터</b>라 <code>yearMonthDateTimeSec</code>가 <code>yearMonth</code>보다 먼저 걸립니다.',
        },
        {
          t: '<b>모바일 크기 — 폭 335 · 모서리 16 · 그림자 없음</b>',
          d: '달력은 <b>폭 100%(최대 335)</b>로 가운데 놓입니다. <b>모서리는 16</b>입니다 — <code>base.css</code>의 4는 따르지 않습니다(사양문서 §2, 마스터 <code>Mobile/Calendar</code> 15397:41496). 그림자도 <b>없습니다</b>(<code>base_mobile.css §11-C</code>, 사용자 지시).',
        },
        {
          t: '<b>달력 헤더는 두 종류입니다 — 이건 ① 셀렉트 방식입니다</b>',
          d: '① <b>셀렉트 방식</b>(년·월 드롭다운 + 좌우 이동)과 ② <b>피커 방식</b>(제목 글자 + 좌우 이동, 아래는 연·월 격자)이 있고 <b>같은 필드라도 렌더 방식에 따라 갈립니다</b>(<code>base_mobile.css §23</code> 머리말). <b>펼친 달력 조각을 실측하면 ①</b>입니다(<code>w2calendar_header</code>만 있고 피커 헤더는 없음). ②는 <b>날짜 입력칸(16.1)의 팝업</b>에서 나타나며 값은 ①과 같게 맞춰 놨습니다 — 높이 64 · padding 8 16 · gap 4 · 좌우 이동 48 × 48 · 제목 글자 16.',
        },
        {
          t: '헤더 값 — 좌우 이동 48 · 년월 셀렉트 48',
          d: '헤더는 <b>335 × 64</b> · padding <b>8 16</b> · gap <b>4</b> · <b>왼쪽부터</b> 붙입니다. 좌우 이동 버튼은 <b>48 × 48</b> · 모서리 <b>8</b> · 테두리 <code>#C4CDD5</code> · 화살표 <b>20</b>. 년·월 셀렉트는 <b>높이 48</b> · 모서리 <b>6</b> · 테두리 <code>#DDDDDD</code> · 글자 <b>16</b>이고 <b>고정폭이 아니라 남는 폭을 반씩 나눠 갖습니다</b>(각 97.5). 사양문서 §5-9 표와 <code>base_mobile.css §11-C</code>가 같은 값입니다. <b>이전 32 스펙은 폐기된 값</b>입니다.',
        },
        {
          t: '<b>좌우 이동은 월 단위 두 개만 그립니다</b>',
          d: '엔진은 연 이동 <code>&lt;&lt;</code> <code>&gt;&gt;</code>까지 넷을 그리지만 <b>모바일 정본에는 월 이동 <code>&lt;</code> <code>&gt;</code> 둘뿐</b>이라 연 이동은 CSS로 숨겼습니다(<code>base_mobile.css §11-C</code>, 사용자 지시). 헤더 자식은 <b>좌 · 년 · 월 · 우 넷</b>입니다.',
        },
        {
          t: '연·월 전용(ym) 변형은 값이 다릅니다',
          d: '<code>yearMonth</code> 변형의 헤더는 <b>335 × 80</b> · padding <b>16</b> · gap <b>2</b>입니다(마스터 <code>Property 1=ym</code> 15397:41497). <b>엔진이 그리는 확인 ✓ · 닫기 ✕도 숨깁니다</b> — 남겨 두면 셀렉트가 각 64.5로 눌려 「2026년」이 잘립니다(폭 47 부족, 실측). 그래서 <b>Figma에도 ✓ ✕를 그리지 않습니다.</b>',
        },
        {
          t: '푸터와 Today 칩',
          d: '푸터는 <b>335 × 68</b> · padding <b>4 16 16</b>, Today 칩은 <b>69 × 48</b> · 모서리 <b>6</b> · <b>16 Medium</b> <code>#237AF3</code>, 오른쪽 날짜 글자는 <b>14</b> <code>#454F5B</code>입니다(사양문서 §5-9). <b>내용이 없는 푸터는 숨겨집니다</b> — 연·월 전용 달력이 빈 푸터 때문에 52px 부풀던 문제를 그렇게 막았습니다.',
        },
        {
          t: '<b>날짜 글자는 16으로 올리지 않습니다</b>',
          d: '모바일에서 텍스트를 일괄 16으로 올렸지만 <b>달력의 요일 · 날짜 · 푸터 날짜는 14 그대로</b>입니다(<code>base_mobile.css:690</code> 「올리지 말 것」 목록). 오늘 표시는 지름 32 <b>테두리 원</b>, 선택일은 지름 32 <b>채운 원</b>입니다.',
        },
      ],
    },
    pitfalls: [
      '<b>주말을 다른 색으로 칠하지 않습니다.</b> 모바일 정본에는 <b>주말 색 구분이 없어</b> 날짜가 전부 <code>#333333</code>이고 전·익월만 <code>#AAAAAA</code>입니다(사양문서 §5-9). PC는 일요일 빨강 · 토요일 파랑입니다.',
      '<b>요일이 영문(Sun~Sat)으로 보이면 CSS가 안 걸린 것입니다.</b> 모바일은 한글(일~토)입니다.',
      '<b>연 이동 <code>&lt;&lt;</code> <code>&gt;&gt;</code>와 확인 ✓ · 닫기 ✕를 그리지 않습니다.</b> 화면에서는 CSS가 숨기므로 그려 두면 Figma와 결과 화면이 어긋납니다.',
      '<b>이름 어디에든 <code>year</code>가 들어가면 연 단위로 판정됩니다.</b> 이름 전체를 보므로 접두어에도 그 단어를 쓰지 않습니다.',
      '<b>칸 안 날짜 입력에는 쓰지 않습니다</b> — 그 용도는 <code>inputcalendar</code>입니다(16.1).',
      '<b>달력 두 개를 가로로 나란히 두지 않습니다.</b> 하나가 이미 콘텐츠 폭(335)을 다 써서 375에 두 개는 물리적으로 들어가지 않습니다 — 모바일은 <b>세로로 쌓습니다</b>(16.3).',
      '<b>기본 날짜나 선택 가능 범위가 정해져 있으면 화면 전달 시 따로 적습니다.</b> 레이어로 지정할 방법이 없습니다.',
      '<b>배포 갭 — 남들이 쓰는 배포본 변환기에는 이 분기가 아직 없습니다.</b> 낡은 배포본으로 변환하면 펼친 달력이 그냥 그룹으로 나갑니다(<code>figma-mobile-xml정합_인수인계.md §8-1</code>의 「구버전에 아예 없는 분기 19종」에 <code>calendar</code>가 들어 있습니다). 변환이 안 되면 디자인이 아니라 <b>변환기 판본</b>을 먼저 확인합니다.',
    ],
    limits: [
      '기본값 · 선택 가능 범위 · 공휴일 표시를 지정할 방법이 없습니다.',
      '달력의 크기와 영역 형태는 클래스(CSS)가 정합니다 — 폭 335 · 모서리 16도 CSS 값입니다.',
      '요일 시작 요일 같은 설정을 전달할 방법이 없습니다.',
      '상태(<code>disabled</code> 등)는 처리되지 않습니다 — 폼 필드 상태 규칙이 걸리지 않는 컴포넌트입니다.',
      '날짜 칸의 상태(오늘 · 선택 · 비활성)를 Figma 변형으로 그려도 결과에 실리지 않습니다. 실제 상태는 엔진이 정합니다.',
    ],
    xmlOut: {
      note: '<b>변환 결과 XML은 PC와 동일합니다.</b> 단위별로 <code>calendarValueType</code>만 달라집니다.',
      code: `<!-- 연·월·일 (단위를 안 적었을 때의 기본) -->
<w2:calendar calendarValueType="yearMonthDate" footerDiv="false" id="" style=""></w2:calendar>

<!-- 연·월 -->
<w2:calendar calendarValueType="yearMonth" footerDiv="false" id="" style=""></w2:calendar>

<!-- 초까지 -->
<w2:calendar calendarValueType="yearMonthDateTimeSec" footerDiv="false" id="" style=""></w2:calendar>`,
      points: [
        '자식이 없습니다 — 헤더 · 요일 · 날짜 격자 · 푸터를 그려도 결과 구조에 포함되지 않습니다.',
        '<code>footerDiv</code>는 <code>false</code> 고정입니다(날짜 입력칸은 <code>true</code>).',
        '<b>폭 335 · 모서리 16 · 그림자 없음 · 주말 색 없음 · 한글 요일은 XML에 없습니다.</b> 전부 모바일 CSS가 하는 일이라 <b>같은 XML이 PC에서는 다르게 보입니다.</b>',
        '상태(<code>disabled</code> 등)는 나가지 않습니다.',
      ],
    },
  },

  {
    chapter: 16, index: 3, id: 'cal-native',
    name: '브라우저 기본형 (native)',
    summary: '펼친 달력의 년·월 컨트롤을 <b>브라우저가 그리는 진짜 <code>&lt;select&gt;</code></b>로 바꾸는 변형 지정자. 모바일 정본에서 <b>Dual Calendar</b>가 이 형태이고, 두 개는 <b>세로로 쌓입니다.</b>',
    capture: null,
    figmaNodeId: '<code>dc1_calendar_native</code> 15539:4616 · <code>dc2_calendar_native</code> 15539:4743 (<code>template_Mobile</code> x5 입력폼 15537:5656 안 <code>dc_group_dual_calendar</code> 15539:4611)',

    build: {
      tree: `dc_group_etcbox                 15539:4610 · 375 · padding 0 20
└ dc_group_dual_calendar        15539:4611
   └ dc_group_gr_cal            15539:4612
                                padding 8 · 테두리 1 #CED4DA · 모서리 3 · 배경 #FFFFFF
      └ dc_group_lybox          15539:4613 · gap 16
         ├ dc1_group_ly_column  15539:4614
         │  └ dc1_calendar_native      세 번째 조각 "native"
         └ dc2_group_ly_column  15539:4615
            └ dc2_calendar_native`,
      points: [
        {
          t: '<code>native</code>는 별도 컴포넌트가 아니라 이름 토큰입니다',
          d: '두 번째 조각은 그대로 <code>calendar</code>이고, <b>이름 어딘가에 <code>native</code>가 있으면</b> 결과에 <code>renderType="native"</code>가 붙습니다. 이름 전체를 보므로 <b>단위와 함께 써도 됩니다</b> — <code>dc1_calendar_yearMonthDate native</code>처럼 이어 붙이면 둘 다 걸립니다.',
        },
        {
          t: '<b>모바일에서 실제로 달라지는 것 — 년·월이 진짜 <code>&lt;select&gt;</code>가 됩니다</b>',
          d: '조각을 실측하면 <b>달력 격자는 그대로이고 년·월 컨트롤만</b> 진짜 <code>&lt;select&gt;</code> 요소로 바뀝니다(클래스도 <code>w2calendar_selectbox_year_native</code>로 달라집니다). PC판 16.3은 이 형태를 「브라우저가 제공하는 날짜 입력」이라 적었지만 <b>모바일 조각에서 확인되는 모습은 위와 같습니다.</b>',
        },
        {
          t: '<b>모바일 함정 — 클래스가 달라 「2026년」이 잘렸습니다</b>',
          d: '16.2의 헤더 규칙은 <code>w2calendar_selectbox_year</code>를 잡는데 이 형태는 <b>접미사 <code>_native</code>가 붙은 클래스</b>라 하나도 안 걸렸고, <code>base.css</code> 기본값 <b>64 × 24</b>로 남아 글자가 잘렸습니다. 지금은 <code>&lt;select&gt;</code> 요소를 통째로 잡아 <b>높이 48 · 모서리 6 · 테두리 <code>#DDDDDD</code> · 글자 16</b>과 <b>남는 폭 반씩 나눠 갖기</b>를 줍니다(<code>base_mobile.css §11-C</code>, 사용자 리포트 2026-08-05).',
        },
        {
          t: '<b>Dual Calendar는 세로로 쌓습니다</b>',
          d: '달력 하나가 이미 콘텐츠 폭 335를 다 써서 <b>가로 2단은 375에 물리적으로 불가능</b>합니다(670 + 간격 + 여백). 그래서 모바일은 <code>lybox</code>를 세로로 돌립니다 — 실측 <b>317 × 383, 간격 16, 좌우 인셋 20 / 20</b>입니다(사양문서 §5-9 · <code>figma-mobile-xml정합_인수인계.md §11</code>).',
        },
        {
          t: '패널(<code>gr_cal</code>) 크롬 값',
          d: 'padding <b>8</b> · 테두리 <b>1px <code>#CED4DA</code></b> · 모서리 <b>3</b> · 배경 <code>#FFFFFF</code>입니다(사양문서 §5-9). <b>달력 자체의 모서리 16과 다른 값</b>이니 섞지 않습니다.',
        },
      ],
    },
    pitfalls: [
      '<b>이름 어디에 <code>native</code>가 들어가도 브라우저 기본형이 됩니다.</b> 접두어나 다른 뜻으로 그 단어를 쓰지 않습니다.',
      '<b>두 달력을 가로로 나란히 그리지 않습니다.</b> Figma에서 가로로 그려도 모바일 CSS가 세로로 쌓아 결과 화면과 어긋납니다.',
      '<b>패널에 높이를 인라인으로 기대하지 않습니다.</b> 정본 XML은 <code>min-height:600px</code>으로 자리를 잡지만 <b>변환기는 클래스가 있는 그룹에 인라인 스타일을 붙이지 않습니다.</b> 그대로 두면 뒷 블록과 겹쳐서, 모바일 CSS가 패널을 일반 흐름으로 되돌려 해결했습니다.',
      '<b>펼쳐진 <code>&lt;select&gt;</code> 목록은 브라우저·OS가 그려 CSS가 닿지 않습니다.</b> 목록이 엉뚱한 자리에 뜬다는 지적이 있었지만 <b>조치할 수 없는 항목</b>으로 정리됐습니다(<code>모바일조합화면_인수인계.md</code> 후속4 ①).',
      '<b>날짜 입력칸(16.1)에 <code>native</code>를 써도 반영되지 않습니다.</b>',
      '<b>배포 갭 — 16.2와 같은 분기라 낡은 배포본에서는 이것도 변환되지 않습니다</b>(<code>figma-mobile-xml정합_인수인계.md §8-1</code>).',
    ],
    limits: [
      '<code>&lt;select&gt;</code>가 펼쳐지는 모양·글꼴·위치를 지정할 방법이 없습니다.',
      '16.2의 제약이 그대로 적용됩니다 — 기본값 · 선택 범위 · 공휴일 · 요일 시작 · 상태.',
      '두 달력을 가로로 두는 배치를 전달할 방법이 없습니다(폭이 물리적으로 부족합니다).',
    ],
    xmlOut: {
      note: '<b>변환 결과 XML은 PC와 동일합니다.</b> 16.2의 결과에 <code>renderType</code> 한 가지가 더 붙습니다.',
      code: `<!-- Dual Calendar (정본 구조) -->
<xf:group class="dual_calendar">
  <xf:group class="gr_cal">
    <xf:group class="lybox">
      <xf:group class="ly_column">
        <w2:calendar calendarValueType="yearMonthDate" footerDiv="false"
                     id="" style="" renderType="native"></w2:calendar>
      </xf:group>
      <xf:group class="ly_column">
        <w2:calendar … renderType="native"></w2:calendar>
      </xf:group>
    </xf:group>
  </xf:group>
</xf:group>`,
      points: [
        '<code>renderType="native"</code>는 이름에 <code>native</code>가 있을 때만 붙습니다.',
        '<b><code>calendarValueType="yearMonthDate"</code>가 하나 더 붙습니다.</b> 정본 XML에는 없는 값이지만 변환기 기본값이라 나가며 <b>화면에 영향은 없습니다</b>(<code>figma-mobile-xml정합_인수인계.md §11</code>).',
        '<code>dual_calendar</code> · <code>gr_cal</code> · <code>lybox</code> · <code>ly_column</code> 네 클래스가 정본과 그대로 일치합니다(노드명 매핑 9/9 통과).',
        '<b>세로로 쌓는 것은 XML에 없습니다</b> — 모바일 CSS가 <code>lybox</code>를 세로로 돌린 결과이고, <b>같은 XML이 PC에서는 가로 2단</b>입니다.',
      ],
    },
  },

  /* ===================== 17장. 스케쥴 캘린더 ===================== */

  {
    chapter: 17, index: 1, id: 'schedulecalendar',
    name: '스케쥴 캘린더 (schedulecalendar)',
    summary: '일정을 월 단위로 보여 주는 달력. 이름만 맞추면 되고 속은 엔진이 그립니다. <b>모바일은 툴바 왼쪽이 「오늘」 하나</b>이고 <b>카드 끝까지 풀폭</b>으로 놓입니다.',
    capture: null,
    figmaNodeId: '<code>template_Mobile</code> t13 15411:5311 (스케쥴캘린더 · XML#12) · 안쪽 <code>sc_schedulecalendar</code> 15411:6515',

    build: {
      tree: `sc_group                             영역 묶음 — 클래스 없음(3장)
├ sctitle_group_titbox
└ sc_group_calendarbox               감싸개 — 없으면 변환기가 만들어 줍니다
   └ sc_schedulecalendar             두 번째 조각 "schedulecalendar"
      ├ cal_toolbar_fc-header-toolbar   375 × 32 · padding 0 20 · gap 4
      │  ├ cal_toolbar_left             "오늘" 하나 (PC는 이동 버튼까지 셋)
      │  ├ cal_title_fc-toolbar-title   "2026년 8월" · 16 · #161C24
      │  └ cal_viewgroup_fc-button-group  월·주·일 각 37 × 32 · 모서리 4 · 간격 4
      └ cal_grid_fc-view                 위·아래 테두리만 1px #C4CDD5
         ├ cal_weekhdr_fc-head           30 · 배경 #F9FAFB · 아래선 #DCE0E4
         └ cal_weekrow_fc-row            80 · 아래선 #DCE0E4  ← 한 줄만 그립니다`,
      points: [
        {
          t: '이름 지정만으로 적용됩니다',
          d: '두 번째 조각을 <code>schedulecalendar</code>로 씁니다. 툴바 · 요일 머리 · 주 단위 행을 그려도 <b>결과에는 태그 하나</b>만 나갑니다(4장 목록).',
        },
        {
          t: '<b>감싸개는 <code>calendarbox</code>입니다</b>',
          d: '정본은 스케쥴 캘린더를 <code>calendarbox</code> 그룹으로 감쌉니다. <b>부모가 이미 <code>calendarbox</code>면 변환기가 그대로 두고, 아니면 하나 만들어 감쌉니다.</b> 이 클래스가 <b>모바일에서 카드 좌우 여백 20을 뚫어 화면 끝까지 넓히는 장치</b>입니다(<code>base_mobile.css:1179</code>, 그리드 · 탭 · 아코디언 · 프로세스와 같은 취급).',
        },
        {
          t: '<b>모바일 함정 — 툴바 왼쪽은 「오늘」 하나입니다</b>',
          d: '엔진은 왼쪽에 이전 · 다음 · 오늘 셋을 그리지만 <b>정본(15411:6515)에는 「오늘」 하나뿐</b>이고, 아이콘 폰트가 안 실려 이전 · 다음이 <b>빈 사각형 두 개</b>로만 보였습니다. 그래서 둘을 숨겼습니다. 혼자 남은 「오늘」은 <b>월 이동이 없어 항상 비활성</b>이 되는데 그 회색이 영구히 무의미하므로 <b>흰 활성 버튼으로 정규화</b>했습니다(<code>base_mobile.css</code>).',
        },
        {
          t: '보기 전환은 <b>붙은 세그먼트가 아니라 낱개 버튼 셋</b>입니다',
          d: '정본은 월 · 주 · 일이 <b>각 37 × 32 · 모서리 4 · 간격 4</b>인 <b>개별 라운드 버튼</b>입니다. <code>base.css</code>는 셋을 테두리로 감싸 이어 붙이므로 그 크롬을 벗기고 낱개로 되돌렸습니다. <b>정본에서는 선택된 「월」도 흰색</b>이라 선택 표시가 따로 없습니다.',
        },
        {
          t: '격자 크롬은 셀 테두리가 없습니다',
          d: '바깥 틀(<code>fc-view</code>)은 <b>위·아래 테두리만</b> <code>#C4CDD5</code>, 요일 머리는 <b>높이 30</b> · 배경 <code>#F9FAFB</code> · 아래선 <code>#DCE0E4</code>, 주 행은 <b>높이 80</b> · 아래선 <code>#DCE0E4</code>입니다. <b>날짜 칸에는 테두리가 없고</b> 오늘 칸만 배경 <code>#ECF2FE</code>, 날짜 숫자는 <b>12 · 가운데</b>입니다(<code>base_mobile.css</code> 실측 주석, 노드 15411:6515).',
        },
        {
          t: '<b>근거 메모 — 이 장은 사양문서에 절이 없습니다</b>',
          d: '모바일 사양문서에는 스케쥴 캘린더 절이 아예 없어 <b><code>base_mobile.css</code>의 실측 주석이 유일한 근거</b>입니다. ⚠️ 그런데 그 주석 안에서도 툴바 값이 갈립니다 — <code>base_mobile.css:1876~1880</code>(§11-B 머리)은 <code>cal_header</code> <b>335 × 48 · padding 16/16/0/16</b>이라 적었고, 바로 아래 <code>:1886~1888</code>은 <code>fc-header-toolbar</code> <b>375 × 32 · padding 0/20 · gap 4</b>라고 적었습니다. <b>여기서는 뒤쪽(375 × 32)을 실었습니다</b> — 실제 구현 규칙(<code>:1992~1994</code> <code>height:32px; padding:0 20</code>)이 그쪽과 일치하기 때문입니다. 값이 의심되면 <b>주석이 아니라 그 규칙</b>을 보십시오.',
        },
        {
          t: '<b>그리는 기준선 — 툴바 + 요일 머리 + 주 한 줄</b>',
          d: '결과에 반영되지 않지만 빈 프레임으로 두면 인수자가 무엇이 놓일 자리인지 알 수 없습니다. <b>툴바(오늘 · 제목 · 보기 전환)와 요일 머리 한 줄, 주 단위 행 한 줄까지</b> 그리고 나머지 주는 생략합니다.',
        },
        {
          t: '일정 데이터는 전달되지 않습니다',
          d: '달력 칸에 일정을 그려도 결과에 반영되지 않습니다. 표시할 일정은 화면이 열린 뒤 데이터가 정합니다.',
        },
      ],
    },
    pitfalls: [
      '<b>주 단위 행을 다섯 줄 다 그리지 않습니다.</b> 이 컴포넌트에서 가장 불필요한 작업입니다.',
      '<b>이전 · 다음 이동 버튼을 그리지 않습니다.</b> 화면에서는 숨겨지므로 그려 두면 Figma와 결과가 어긋납니다.',
      '<b>감싸개 클래스를 <code>calendarbox</code> 말고 다른 이름으로 주면 변환기가 하나 더 만들어 이중으로 감쌉니다.</b> 그대로 <code>calendarbox</code>를 씁니다.',
      '두 번째 조각을 <code>schedule_calendar</code>처럼 쪼개면 인식되지 않습니다.',
      '<b>초기 표시 형태(월 / 주 / 일)가 정해져 있으면 화면 전달 시 따로 적습니다.</b> 레이어로 지정할 수 없습니다.',
      '<b>배포 갭 — 남들이 쓰는 배포본 변환기에는 이 분기가 아직 없습니다.</b> 낡은 배포본으로 변환하면 이 컴포넌트가 그냥 그룹으로 나갑니다(<code>figma-mobile-xml정합_인수인계.md §8-1</code>). 변환이 안 되면 디자인이 아니라 <b>변환기 판본</b>을 먼저 확인합니다.',
    ],
    limits: [
      '일정 데이터와 초기 표시 형태를 전달할 방법이 없습니다.',
      '<b>높이는 600 고정</b>입니다(<code>style="width: 100%;height: 600px"</code>). Figma에서 다르게 그려도 이 값이 나갑니다.',
      '툴바의 버튼 구성을 지정할 방법이 없습니다.',
      '<b>모바일 화면에서는 월 이동이 되지 않습니다</b> — 이동 버튼을 숨겼기 때문입니다. 다른 달을 확인해야 하면 화면 사양으로 따로 전달합니다.',
    ],
    xmlOut: {
      note: '<b>변환 결과 XML은 PC와 동일합니다.</b> 감싸개 <code>calendarbox</code>까지 함께 나갑니다.',
      code: `<xf:group style="" id="" class="calendarbox">
    <w2:scheduleCalendar defaultDate="" endColumn="end" editable="true" selectable="true"
      headerRightBtn="true" includeScheduleEnd="false" locale="ko" version="3.6"
      ioFormat="yyyyMMdd" themeColumn="" titleColumn="title" tooltipDisplay=""
      eventOrderColumn="" startColumn="start" dataList="" nextDayThreshold=""
      timeFormat="" eventLimit="true" style="width: 100%;height: 600px"
      id="scheduleCalendar1" headerLeftBtn="true" lang="ko" headerTitle="true"
      idColumn="id"></w2:scheduleCalendar>
</xf:group>`,
      points: [
        '하위 항목 없이 태그 하나로 나갑니다 — 툴바 · 격자는 결과에 포함되지 않습니다.',
        '속성은 변환기가 붙이는 <b>표준 세트</b>입니다. <code>id="scheduleCalendar1"</code>과 <code>style="width: 100%;height: 600px"</code>도 고정값입니다.',
        '<b>부모가 이미 <code>calendarbox</code>면 감싸개를 하나 더 만들지 않습니다.</b>',
        '<b>이동 버튼 숨김 · 툴바 높이 32 · 격자 색은 XML에 없습니다.</b> 전부 모바일 CSS가 하는 일이라 <b>같은 XML이 PC에서는 이동 버튼이 있는 화면</b>이 됩니다.',
      ],
    },
  },

  /* ===================== 18장. 그 밖의 컴포넌트 ===================== */

  {
    chapter: 18, index: 1, id: 'message',
    name: '메시지 (message)',
    summary: '안내 · 오류 문구와 목록. 위젯이 아니라 <b>클래스로만</b> 만듭니다. 모바일에서는 글자가 <b>14 → 16</b>으로 올라갔습니다.',
    capture: null,
    figmaNodeId: '<code>template_Mobile</code> x7 15537:6598 (메시지 / 리스트박스 · XML#11) · 마스터 <code>msg_group_msgbox …</code> 15537:6517~6521 · <code>list_group_listbox …</code> 15537:6522~6526',

    build: {
      tree: `msg_group                     영역 묶음 — 클래스 없음(3장)
├ msgtitle_group_titbox
├ msgtxt_group                한 줄 안내 4종
│  ├ t_textbox_txt_info
│  ├ t_textbox_txt_error
│  ├ t_textbox_txt_success
│  └ t_textbox_txt_warning
├ m_group_msgbox info         335 × 70 · 모서리 6 · padding 12
│  ├ ico_msg_info             (장식 — 매핑 안 됨, 아이콘은 CSS가 그립니다)
│  ├ m_textbox_txt_msg        라벨 16 SemiBold · 줄높이 19.36
│  └ m_textbox_txt_con        내용 16 Regular  (라벨과 간격 5)
├ m_group_msgbox error / success / warning / (종류 없음)
├ lb_group_listbox            불릿 목록
│  └ item_group × 4           ← 직속 자식만 항목이 됩니다
│     └ item_textbox          16 · #454F5B · 항목 높이 19 · 항목 간격 4
├ lb_group_listbox hyphen
├ lb_group_listbox no_dot
└ tt_group_tblbox             툴팁 예시(표로 그린 것)`,
      points: [
        {
          t: '한 줄 안내는 텍스트에 클래스만 씁니다',
          d: '<code>txt_info</code> · <code>txt_error</code> · <code>txt_success</code> · <code>txt_warning</code> 네 가지입니다. <b>앞에 붙는 아이콘은 클래스의 CSS가 만들므로 텍스트에 클래스만 주면 됩니다.</b>',
        },
        {
          t: '박스형은 <code>msgbox</code>에 종류를 <b>공백으로</b> 이어 씁니다',
          d: '<code>m_group_msgbox info</code>처럼 <code>info</code> · <code>error</code> · <code>success</code> · <code>warning</code>을 공백으로 구분해 붙입니다. <b>종류를 안 쓰면 색이 없는 기본 박스</b>가 됩니다.',
        },
        {
          t: '<b>모바일 값 — 박스 335 × 70 · 모서리 6 · padding 12</b>',
          d: '라벨 <code>txt_msg</code>는 <b>16 SemiBold</b>, 내용 <code>txt_con</code>은 <b>16 Regular</b>, 줄높이는 <b>19.36</b>, 라벨과 내용 사이는 <b>5</b>입니다. <b>그동안 모바일 전용 규칙이 하나도 없어 14로 남아 있던 것을 16으로 올렸습니다</b>(<code>base_mobile.css:2591~2602</code> · 실측 노드 <code>msg_group_msgbox info</code> 15537:6517). padding 12 · 모서리 6 · 왼쪽 들여쓰기 23은 원래 값이 맞아 그대로입니다.',
        },
        {
          t: '<b>목록은 <code>listbox</code> 클래스만 주면 태그가 자동으로 붙습니다</b>',
          d: '<code>listbox</code> 클래스가 있는 그룹은 <code>&lt;ul&gt;</code>로, <b>직속 하위 그룹은 각각 <code>&lt;li&gt;</code></b>로 나갑니다. <b>목록 태그를 레이어로 만들 필요가 없습니다</b> — 클래스 하나면 변환기가 태그를 붙여 줍니다(표의 행·셀 보강과 같은 방식입니다 — 4.4). <b>불릿 기호는 CSS가 그리므로 도형으로 그리지 않습니다.</b>',
        },
        {
          t: '<b>모바일 값 — 목록 항목 16 · 높이 19 · 간격 4</b>',
          d: '항목 글자는 <b>16 Regular</b> <code>#454F5B</code>, 항목 높이 <b>19</b>, 항목 사이 <b>4</b>, 글머리 점 <b>3 × 3</b>, 왼쪽 들여쓰기 <b>8</b>입니다(실측 노드 <code>list_group_listbox</code> 15537:6522). <b>글자가 커지며 줄높이가 늘어 글머리 점이 위로 떠서 세로 위치를 5 → 8로 내렸습니다.</b>',
        },
        {
          t: '목록 종류는 클래스 토큰이 정합니다',
          d: '<code>listbox</code>만 쓰면 불릿, <code>listbox hyphen</code>은 하이픈, <code>listbox no_dot</code>은 기호 없음입니다. <b>모바일 컴포넌트에는 <code>count</code> · <code>circled</code> 두 가지가 더 있습니다</b>(15537:6525 · 6526). ⚠️ 다만 이 두 클래스는 <b>서버에 올라간 <code>base.css</code>에만 있어</b> 손안의 CSS로 미리 보면 걸리지 않습니다(<code>figma-mobile-xml정합_인수인계.md §4-2</code> — 위 「완성 모습」 조각의 CSS에도 없습니다).',
        },
        {
          t: '툴팁은 이 컴포넌트로 만들 수 없습니다',
          d: '템플릿의 툴팁 예시는 <b>표(<code>tblbox</code>)로 그린 것</b>이고, 마우스를 올렸을 때 뜨는 안내는 Figma로 전달할 수 없습니다. <b>모바일에서는 그 표마저 목록으로 바뀝니다</b>(10장 — 조각에서 행 제목이 칸 위로 올라간 것을 확인할 수 있습니다). ⚠️ 툴팁 컴포넌트 자체는 <b>아이콘 파일이 서버에 없어 아직 만들지 못한 상태</b>입니다.',
        },
      ],
    },
    pitfalls: [
      '<b>불릿 기호를 그리지 않습니다.</b> 기호는 <code>listbox</code> 클래스의 CSS가 만들고, 도형으로 그리면 매핑되지 않습니다.',
      '<b>목록 그룹에 <code>listbox</code> 클래스를 빠뜨리지 않습니다.</b> 없으면 <code>ul</code> / <code>li</code>가 아닌 그냥 그룹이 되어 기호와 줄 간격이 사라집니다.',
      '<b>항목을 <code>listbox</code>의 직속 하위가 아닌 자리에 두면 <code>li</code>가 되지 않습니다.</b>',
      '<code>msgbox</code>의 종류를 <code>msgbox_info</code>처럼 밑줄로 이으면 다른 클래스가 됩니다. <b>공백</b>으로 구분합니다.',
      '<b>종류 없는 기본 박스의 문구에도 <code>txt_msg</code>를 줍니다.</b> 클래스가 없으면 글자 크기는 다른 규칙이 16으로 맞춰 주지만 <b>줄높이 19.36은 걸리지 않습니다.</b>',
      '<b><code>ico_msg_*</code> 아이콘 레이어는 결과에 나가지 않지만 Figma에는 실제 아이콘 파일을 넣습니다.</b> 모바일 컴포넌트가 그렇게 만들어져 있어 인수자가 화면에서 종류를 구분할 수 있습니다.',
    ],
    limits: [
      '마우스를 올렸을 때 뜨는 툴팁은 전달할 수 없습니다.',
      '메시지 종류는 네 가지(<code>info</code> · <code>error</code> · <code>success</code> · <code>warning</code>)뿐입니다.',
      '목록의 기호 모양과 들여쓰기는 클래스(CSS)가 정합니다.',
      '목록 항목 안에 하위 목록을 중첩할 수 없습니다.',
      '<b>박스 폭 335는 지정하는 값이 아닙니다</b> — 카드가 좌우 20을 잡아 준 결과입니다.',
    ],
    xmlOut: {
      note: '<b>변환 결과 XML은 PC와 동일합니다.</b> 글자 16 · 항목 높이 19 같은 모바일 값은 XML에 없고 전부 CSS입니다.',
      code: `<!-- 한 줄 안내 -->
<w2:textbox class="txt_info" label="Info"></w2:textbox>

<!-- 박스형 -->
<xf:group class="msgbox info">
  <w2:textbox class="txt_msg" label="Info"></w2:textbox>
</xf:group>
<xf:group class="msgbox">          ← 종류를 안 적은 기본 박스
  <w2:textbox class="txt_msg" label="Info"></w2:textbox>
</xf:group>

<!-- 목록 -->
<xf:group class="listbox" tagname="ul">
  <xf:group tagname="li">
    <w2:textbox label="텍스트 텍스트"></w2:textbox>
  </xf:group>
  …
</xf:group>
<xf:group class="listbox hyphen" tagname="ul"> … </xf:group>`,
      points: [
        '<code>tagname="ul"</code> · <code>tagname="li"</code>는 변환기가 붙이는 값입니다 — 이름에 쓰지 않아도 나갑니다.',
        '<code>li</code>에는 <code>style</code>이 나가지 않습니다. 오토레이아웃 측정값이 실리면 불릿 위치가 어긋나서 변환기가 지웁니다.',
        '<code>ico_msg_*</code> 아이콘 레이어는 결과에 나가지 않고 아이콘은 클래스의 CSS가 그립니다.',
        '<b>모바일 노드 21개를 전수 검사해 클래스가 정본과 완전히 일치하는 것을 확인했습니다</b>(<code>msgbox info</code> · <code>listbox count</code> · <code>txt_msg</code> · <code>txt_con</code> · <code>txt_info/error/success/warning</code>).',
      ],
    },
  },

  {
    chapter: 18, index: 2, id: 'widget',
    name: '위젯 컨테이너 (widget)',
    summary: '카드형 위젯을 늘어놓는 영역. 위젯은 XML이 아니라 <b>화면이 열릴 때 스크립트가 만듭니다.</b> <b>모바일에서는 3칸이 아니라 한 줄에 하나씩 세로로 쌓입니다.</b> <b>모바일 디자인 템플릿에는 위젯 컨테이너에 대응하는 인스턴스가 없어, 이 항목은 완성 모습(캡처)을 싣지 못했습니다.</b>',
    capture: null,
    figmaNodeId: '(모바일 미확정 — <code>template_Mobile</code>의 자식 17개 어디에도 위젯 컨테이너가 없고, 사양문서 §4 컴포넌트 목록에도 없습니다)',

    build: {
      tree: `wc_group                  영역 묶음 — 클래스 없음(3장)
├ wctitle_group_titbox
└ wc_widget_w2widgetContainer       두 번째 조각 "widget" → 위젯 컨테이너
   ├ wgt_group_w2widget             이름이 "w2widget"으로 끝나야 위젯으로 셉니다
   │  ├ wgt_title_w2widget_title    이름에 "w2widget_title" 포함 → 위젯 제목
   │  └ wgt_content_w2widget_content   속은 결과에 안 나갑니다
   ├ wgt_group_w2widget             (같은 구조로 여러 개)
   └ wgt_group_w2widget`,
      points: [
        {
          t: '<b>위젯 이름은 <code>w2widget</code>으로 끝나야 합니다</b>',
          d: '컨테이너의 <b>직속 하위</b> 중 <b>이름이 <code>w2widget</code>으로 끝나는</b> 것만 위젯으로 셉니다. <code>w2widget_box</code>처럼 뒤에 뭔가 더 붙으면 위젯으로 잡히지 않습니다.',
        },
        {
          t: '제목은 <code>w2widget_title</code>이 들어간 레이어에서 가져옵니다',
          d: '위젯 안에서 <b>이름에 <code>w2widget_title</code>이 든 레이어</b>를 찾아 그 안 첫 텍스트를 제목으로 씁니다. 없으면 <code>title</code>이 들어갑니다.',
        },
        {
          t: '<b>배치는 캔버스 위치가 아니라 레이어 순서가 정합니다</b>',
          d: '위젯은 <b>레이어 순서대로</b> 자리를 받습니다. 변환기는 <b>가로 3칸 기준</b>으로 좌표를 계산하므로 네 번째 위젯이 둘째 줄 첫 칸이 됩니다. Figma에서 옮겨 놓아도 결과가 바뀌지 않으니 <b>보이는 순서와 레이어 순서를 맞춥니다.</b>',
        },
        {
          t: '<b>모바일 함정 — XML은 3칸인데 화면은 1칸입니다</b>',
          d: '변환기가 계산하는 좌표는 <b>모바일에서도 가로 3칸 기준</b>이라 그대로 두면 위젯 폭이 92까지 눌리고 오른쪽 위젯이 화면 밖(오른쪽 끝 692)으로 나갔습니다. <b>모바일 CSS가 위젯을 일반 흐름으로 되돌려 한 줄에 하나씩, 간격 12로 세로로 쌓습니다</b>(<code>base_mobile.css:2557~2568</code>). <b>그래서 XML의 <code>x</code> · <code>y</code>는 모바일 화면에서 쓰이지 않습니다</b> — 화면에 보이는 순서는 레이어 순서 그대로입니다.',
        },
        {
          t: '<b>그리는 기준선 — 제목 줄 + 빈 본문 박스</b>',
          d: '<code>w2widget_content</code> 안에 차트나 표를 그려도 결과에는 들어가지 않습니다 — 전달되는 것은 <b>위젯 개수와 제목</b>뿐입니다. 그래도 <b>위젯마다 제목 줄과 본문 자리(빈 박스)까지는 그립니다.</b> 그래야 보는 사람이 몇 칸짜리인지 압니다. 본문 안 차트·표는 생략합니다.',
        },
        {
          t: '컨테이너의 크기와 클래스는 변환기가 정합니다',
          d: '컨테이너는 <b>클래스가 지워지고</b> 크기가 고정값으로 나갑니다. 런타임 클래스가 XML에 남으면 위젯을 다시 만들 때 무너지기 때문입니다. <b>모바일에서는 높이도 CSS가 내용에 맞게 풀어 줍니다.</b>',
        },
      ],
    },
    pitfalls: [
      '<b>이름이 <code>w2widget</code>으로 끝나지 않으면 위젯으로 세지 않아</b> 그 위젯이 화면에 나타나지 않습니다.',
      '<b>Figma에서 위치를 옮겨도 결과 배치는 바뀌지 않습니다.</b> 순서를 바꿉니다.',
      '<b>본문 안 차트 · 표는 그리지 않습니다.</b> 제목 줄과 빈 본문까지만 그리고, 전달되는 것은 개수와 제목입니다.',
      '<b>제목 레이어 이름에 <code>w2widget_title</code>을 넣습니다.</b> 없으면 제목이 <code>title</code>로 나갑니다.',
      '<b>모바일 화면을 가로 3칸으로 그리지 않습니다.</b> XML에는 3칸 좌표가 나가지만 화면은 세로 한 줄이라 Figma와 결과가 어긋납니다.',
      '<b>배포 갭 — 남들이 쓰는 배포본에도 이 분기는 있지만</b>, 세로 한 줄로 쌓는 것은 <b>모바일 CSS</b>가 하는 일이라 그 CSS가 없는 환경에서는 3칸 그대로 나옵니다.',
    ],
    limits: [
      '위젯 안의 내용은 전달할 수 없습니다.',
      '위젯이 차지하는 칸 수를 지정할 수 없습니다 — 모두 1칸입니다.',
      '컨테이너 높이를 지정할 수 없습니다(고정값). 모바일에서는 CSS가 내용 높이로 풀어 줍니다.',
      '위젯의 접힘 · 닫힘 상태를 지정할 수 없습니다.',
      '<b>모바일에서 한 줄에 두 개를 두는 배치를 전달할 방법이 없습니다.</b>',
    ],
    xmlOut: {
      note: '<b>변환 결과 XML은 PC와 동일합니다.</b> 컨테이너는 <b>빈 태그</b>로 나가고 위젯은 화면이 열릴 때 스크립트가 만듭니다 — <b>XML만 봐서는 위젯이 보이지 않습니다.</b>',
      code: `<w2:widgetContainer id="widgetSample" style="width:100%;height:610px;"></w2:widgetContainer>

<!-- 화면이 열릴 때 실행되는 부분 -->
var widgetOptions1 = {};
widgetOptions1.id = "wg_widget1";
widgetOptions1.scope = true;
widgetOptions1.unitWidth = 1;
widgetOptions1.unitHeight = 1;
widgetOptions1.title = "위젯 제목";
widgetOptions1.x = 0;   widgetOptions1.y = 0;
widgetSample.addWidgets(widgetOptions1);

var widgetOptions4 = {};
widgetOptions4.title = "위젯 제목";
widgetOptions4.x = 0;   widgetOptions4.y = 1;   ← 네 번째가 둘째 줄로
widgetSample.addWidgets(widgetOptions4);`,
      points: [
        '컨테이너 태그에 하위 항목이 없습니다. 위젯은 마크업이 아니라 <b>스크립트로</b> 추가됩니다.',
        '<code>x</code> · <code>y</code>는 <b>레이어 순서에서 계산한 값</b>입니다(가로 3칸 기준 0·0 → 1·0 → 2·0 → 0·1). Figma 좌표와 무관합니다.',
        '<b>모바일 화면에서는 이 <code>x</code> · <code>y</code>가 쓰이지 않습니다</b> — CSS가 세로 한 줄로 되돌리기 때문입니다. <b>같은 XML이 PC에서는 가로 3칸</b>으로 보입니다.',
        '<code>class</code>는 나가지 않습니다 — 변환기가 지웁니다.',
        '<code>w2widget_title</code> · <code>w2widget_content</code> 레이어는 결과 XML에 나가지 않습니다.',
        '<code>unitWidth</code> · <code>unitHeight</code>는 항상 1이고 컨테이너 <code>id</code>는 없으면 <code>widgetSample</code>이 붙습니다.',
      ],
    },
  },

  {
    chapter: 18, index: 3, id: 'floatinglayer',
    name: '떠 있는 레이어 (floatinglayer)',
    summary: '화면 위에 떠서 보이는 창. <b>제목만</b> 전달되고 속은 결과에 나가지 않습니다. XML에는 폭 300이 나가지만 <b>모바일 화면에서는 카드 안쪽 폭 335</b>로 넓혀집니다.',
    capture: null,
    figmaNodeId: '(모바일 미확정 — <code>template_Mobile</code>의 자식 17개에 없고 사양문서 §4 컴포넌트 목록에도 없습니다)',

    build: {
      tree: `fl_group                  영역 묶음 — 클래스 없음(3장)
├ fltitle_group_titbox
└ fl_floatinglayer_w2floatingLayer     두 번째 조각 "floatinglayer"
   ├ fl_titlebar
   │  ├ fl_title_text                  "Title" ← 창 제목이 됩니다
   │  └ fl_close_ico_pop_close          (장식 — 닫기는 엔진이 그립니다)
   └ fl_content                         속은 결과에 안 나갑니다`,
      points: [
        {
          t: '제목만 전달됩니다',
          d: '레이어 안에서 <b>처음 만나는 텍스트</b>가 창 제목이 됩니다. 텍스트가 없으면 <code>Title</code>이 들어가고, 제목 말고는 아무것도 전달되지 않습니다.',
        },
        {
          t: '<b>그리는 기준선 — 제목바 + 빈 본문</b>',
          d: '제목바 · 닫기 버튼 · 본문을 그려도 결과에는 <b>태그 하나</b>만 나갑니다(4장 목록). 그래도 <b>제목바(제목 글자 + 닫기 아이콘)와 빈 본문 박스까지는 그립니다.</b> 창 안에 들어갈 내용은 개발 단계에서 채웁니다.',
        },
        {
          t: '<b>모바일 함정 — XML은 300, 화면은 335입니다</b>',
          d: '결과에는 <code>position:absolute</code>와 함께 <b>300 × 300</b>이 고정으로 붙습니다. 그런데 모바일 카드 폭은 375이고 안쪽은 335라 <b>300으로 두면 오른쪽에 빈 자리가 남습니다.</b> 그래서 모바일 CSS가 <b>카드 좌우 여백 20을 뺀 폭</b>으로 넓힙니다(<code>base_mobile.css:2570~2579</code>). <b>Figma에서 크기를 조정해도 결과 XML은 300 × 300</b>이고 화면 폭은 CSS가 정합니다.',
        },
        {
          t: '<b>폭을 100%로 잡으면 오히려 넘칩니다</b>',
          d: '단순히 <code>width:100%</code>를 주면 기준이 <b>카드 바깥(375, 여백 포함)</b>이라 20 + 375 = <b>395</b>가 되어 화면 밖으로 나갑니다. 그래서 <b>여백 두 쪽을 뺀 계산식</b>을 씁니다. 테두리 1px 두 쪽도 폭에 더해져 2px 넘쳤던 것을 함께 잡았습니다.',
        },
        {
          t: '아래 요소와 겹쳐 보입니다',
          d: '떠 있는 레이어는 <b>흐름에서 빠진 요소</b>라 아래 내용 위에 올라탑니다. <b>Figma에서 아래에 여백을 비워 둬도 그 여백은 결과에 나가지 않으므로</b>(5장), 필요한 여백은 화면 전달 시 따로 적습니다.',
        },
      ],
    },
    pitfalls: [
      '<b>창 안 내용은 그리지 않습니다.</b> 제목바와 빈 본문까지만 그리고, 결과에 가는 것은 제목뿐입니다.',
      '<b>제목바에 텍스트를 하나만 둡니다.</b> 여럿이면 첫 번째만 제목이 됩니다.',
      '<b>창 크기가 정해져 있으면 화면 전달 시 따로 적습니다.</b> Figma에서 조정해도 결과는 300 × 300입니다.',
      '<b>모바일 화면에서 보이는 폭(335)을 XML 값으로 착각하지 않습니다.</b> XML은 300이고 335는 CSS가 만든 값입니다.',
      '닫기 · 최소화 버튼은 그려도 전달되지 않고 엔진이 만듭니다.',
    ],
    limits: [
      '창 안 내용은 전달할 수 없습니다.',
      '창 크기와 처음 뜨는 위치를 지정할 수 없습니다.',
      '열림 / 닫힘 상태, 끌어 옮길 수 있는지 같은 동작을 전달할 방법이 없습니다.',
      '<b>모바일에서 세로 높이는 300 그대로입니다</b> — 폭만 카드에 맞췄습니다.',
    ],
    xmlOut: {
      note: '<b>변환 결과 XML은 PC와 동일합니다.</b> 폭 300은 단말과 무관한 고정값입니다.',
      code: `<w2:floatingLayer id="" title="Title"
                  style="position:absolute;width: 300px;height: 300px;"></w2:floatingLayer>`,
      points: [
        '하위 항목이 나가지 않습니다 — 제목바 · 닫기 · 본문이 모두 결과에 없습니다.',
        '<code>title</code>에 처음 만난 텍스트가 들어갔습니다.',
        '크기와 <code>position:absolute</code>는 변환기가 붙이는 고정값입니다.',
        '<b>모바일에서 폭이 335가 되는 것은 XML에 없습니다</b> — CSS가 카드 안쪽 폭으로 넓힌 결과라 <b>같은 XML이 PC에서는 300</b>입니다.',
      ],
    },
  },

  {
    chapter: 18, index: 4, id: 'processbar',
    name: '진행 단계 (processbar)',
    summary: '여러 단계를 순서대로 보여 주는 컴포넌트. <b>상태가 결과에 실리는 드문 컴포넌트</b>입니다. 모바일에서는 <b>화면 끝까지 풀폭</b>으로 놓이고 다섯 단계가 <b>폭을 똑같이 나눠 갖습니다.</b>',
    capture: null,
    figmaNodeId: '<code>template_Mobile</code> t14 15411:6494 (프로세스 · XML#13) · 안쪽 <code>pr_steps</code> 15434:4647',

    build: {
      tree: `pr_group                  영역 묶음 — 클래스 없음(3장)
├ prtitle_group_titbox
└ pr_processbar_processbar         두 번째 조각 "processbar"
   └ pr_steps                      15434:4647
      ├ pr_step_finish             2번째 "step" → 단계 하나 · 3번째 "finish" → 끝난 단계
      │  ├ pr_num_finish           24 × 24 원 — 파란 채움 · 흰 글자
      │  ├ pr_dotwrap              점 6 × 6 · 간격 2 · 줄 높이 16
      │  └ pr_label                2번째 조각 "label" → 단계 이름 · 글자 13
      ├ pr_step_on                 3번째 "on" → 지금 단계
      ├ pr_step × 3                3번째 조각이 없으면 아직 안 온 단계
      ├ pr_connector_on            단계와 형제로 둡니다 — 원과 원을 잇는 막대
      └ pr_connector × 3           지나온 구간만 _on

   ※ 연결선이 원 사이에 겹쳐 놓이므로 pr_steps는 오토레이아웃이 아니라 자유 배치입니다.`,
      points: [
        {
          t: '단계는 두 번째 조각이 <code>step</code>인 프레임입니다',
          d: '<code>pr_step_finish</code>처럼 두 번째 조각이 <code>step</code>이면 단계 하나로 잡힙니다. <b>몇 겹 안에 들어 있어도 찾아내므로</b> <code>pr_steps</code>로 한 번 묶어도 됩니다.',
        },
        {
          t: '상태는 세 번째 조각이 정합니다',
          d: '<code>finish</code>는 끝난 단계, <code>on</code>은 지금 단계, <b>아무것도 안 쓰면 아직 안 온 단계</b>입니다. 이 장의 다른 컴포넌트와 달리 <b>상태가 결과에 실립니다.</b>',
        },
        {
          t: '단계 이름은 <code>label</code>에서 가져옵니다',
          d: '단계 안에서 두 번째 조각이 <code>label</code>인 레이어의 텍스트를 씁니다. 없으면 <code>Step1</code> · <code>Step2</code>처럼 순번이 들어갑니다.',
        },
        {
          t: '<b>모바일 값 — 화면 끝까지 풀폭, 다섯 칸을 똑같이 나눕니다</b>',
          d: '진행 단계는 <b>카드 좌우 여백 20을 뚫어 화면 끝까지</b> 갑니다(<code>base_mobile.css:1179</code> — 그리드 · 탭 · 아코디언 · 스케쥴 캘린더와 같은 취급). 그리고 <b>다섯 단계가 폭을 똑같이 나눠 갖습니다</b>(375 기준 각 <b>75</b>).',
        },
        {
          t: '<b>모바일 함정 — 그대로 두면 두 줄로 접혔습니다</b>',
          d: '기본 CSS가 단계 하나를 <b>90</b>으로 잡아 다섯이면 450 + 여백이라 375를 넘겨 <b>두 줄로 내려갔습니다</b>(사용자 리포트). 그래서 여백을 0으로 두고 <b>다섯 칸 균등 분할</b>로 바꿨습니다. ⚠️ <b>같은 CSS 안에서도 정본 단계 폭이 한 곳은 90, 다른 곳은 「375에 다섯이 꽉 차서 각 75」로 적혀 있습니다</b>(<code>base_mobile.css:2240</code> ↔ <code>2252~2256</code>). <b>화면에 나오는 값은 75</b>이므로 Figma도 375 폭에 다섯 칸이 꽉 차게 그립니다.',
        },
        {
          t: '동그라미 · 점 · 라벨 값',
          d: '단계 번호 원은 <b>24 × 24</b>이고 <b>끝난 단계는 파란 채움 + 흰 글자</b>입니다(기본 CSS는 흰 바탕 + 파란 테두리라 지금 단계와 구분되지 않았습니다). 점은 <b>6 × 6</b> · 모서리 3 · 간격 2 · 줄 높이 16이고, 지나온 만큼 파랗게 찹니다. 번호와 라벨 글자는 <b>13</b>입니다. <b>파랑은 <code>#237AF3</code></b>입니다 — CSS 주석에 남은 <code>#256EF4</code>는 PC 값이나 옛 실측 기록이고 <b>모바일 파랑은 <code>#237AF3</code> 하나</b>입니다(<code>base_mobile.css:48~50</code>).',
        },
        {
          t: '<b>번호 · 점 · 연결선은 결과에 안 나가지만 Figma에는 그립니다</b>',
          d: '단계 번호 · 진행 점 · 연결선은 <b>변환기가 순서를 보고 새로 만들기 때문에</b> 그린 것이 결과 XML에 나가지 않습니다. 다만 빼 버리면 Figma 화면에 <b>라벨만 남아</b> 진행 단계로 보이지 않습니다. 인수자가 보는 것은 그 화면이므로 <b>템플릿과 똑같이 그립니다.</b>',
        },
        {
          t: '단계를 왼쪽부터 순서대로 둡니다',
          d: '레이어 순서가 단계 순서가 되고 번호도 그 순서로 붙습니다(4장). 끝난 단계 · 지금 단계 · 안 온 단계를 <b>왼쪽부터 차례대로</b> 둡니다.',
        },
      ],
    },
    pitfalls: [
      '<b>다섯 단계가 375 폭에 꽉 차게 그립니다.</b> 단계마다 90을 잡으면 화면에서 두 줄로 접히거나 Figma와 결과가 어긋납니다.',
      '<b>점 개수를 단계마다 다르게 그려도 결과는 항상 다섯 개입니다.</b> 변환기가 <b>모든 단계에 점 다섯 개</b>를 만들고 <b>순번만큼</b> 채웁니다(1단계 하나 → 5단계 다섯). 정본 Figma는 지금 단계에만 점을 그렸지만 <b>결과 XML과 화면은 위와 같습니다.</b>',
      '<b>상태를 세 번째 조각에 씁니다.</b> <code>finish</code> · <code>on</code> 말고 다른 단어를 쓰면 「아직 안 온 단계」로 처리됩니다.',
      '<b>연결선을 단계 <em>안</em>에 넣지 않습니다.</b> 단계와 형제로 두어야 원과 원 사이에 놓입니다.',
      '<b>단계 이름이 <code>Step1</code>처럼 나오면 <code>label</code> 조각을 빠뜨린 것입니다.</b>',
      '<b>배포 갭 — 남들이 쓰는 배포본 변환기에는 이 분기가 아직 없습니다.</b> 낡은 배포본으로 변환하면 진행 단계가 그냥 그룹으로 나갑니다(<code>figma-mobile-xml정합_인수인계.md §8-1</code>).',
    ],
    limits: [
      '단계 개수 말고 <b>진행률을 숫자로</b> 전달할 방법이 없습니다.',
      '점 개수(다섯)를 바꿀 수 없습니다.',
      '연결선의 길이 · 두께 · 색을 지정할 수 없습니다 — 클래스(CSS)가 정합니다.',
      '단계를 눌렀을 때의 동작은 <code>scwin.stepN_onclick</code>이라는 <b>이름만</b> 나가고 내용은 개발 단계에서 채웁니다.',
      '<b>세로로 쌓는 배치를 전달할 방법이 없습니다</b> — 모바일에서도 가로 한 줄입니다.',
    ],
    xmlOut: {
      note: '<b>변환 결과 XML은 PC와 동일합니다.</b> 목록(<code>ul</code> / <code>li</code>) 구조로 나가고 번호 · 점 · 클릭 이름을 변환기가 만듭니다.',
      code: `<xf:group tagname="ul" id="" style="" class="processbar">
  <xf:group tagname="li" ev:onclick="scwin.step1_onclick" id="step1" class="finish">
    <w2:span style="" id="" label="1" class="num"></w2:span>
    <xf:group style="" id="" class="dot_wrap">
      <w2:span label="" class="dot on"></w2:span>
      <w2:span label="" class="dot"></w2:span>
      <w2:span label="" class="dot"></w2:span>
      <w2:span label="" class="dot"></w2:span>
      <w2:span label="" class="dot"></w2:span>
    </xf:group>
    <w2:textbox style="" id="" label="Step1"></w2:textbox>
  </xf:group>

  <xf:group tagname="li" ev:onclick="scwin.step2_onclick" id="step2" class="on">
    <w2:span label="2" class="num"></w2:span>
    <xf:group class="dot_wrap">
      <w2:span label="" class="dot on"></w2:span>
      <w2:span label="" class="dot on"></w2:span>
      …                                        ← 점 다섯 개 중 둘이 on
    </xf:group>
    <w2:textbox label="Step2"></w2:textbox>
  </xf:group>

  <xf:group tagname="li" ev:onclick="scwin.step3_onclick" id="step3">
    …                                          ← 상태 조각이 없으면 class 자체가 없습니다
  </xf:group>
</xf:group>`,
      points: [
        '<b>점은 항상 다섯 개</b>이고 <code>on</code>이 붙는 개수가 <b>단계 번호</b>입니다. Figma에서 그린 점 개수는 쓰이지 않습니다.',
        '<code>id="stepN"</code> · <code>ev:onclick="scwin.stepN_onclick"</code> · 번호 <code>label</code>은 <b>레이어 순서</b>에서 만들어집니다.',
        '상태 조각이 없으면 <code>class</code> 속성 자체가 나가지 않습니다 — 그것이 「아직 안 온 단계」입니다.',
        '<b>화면 끝까지 넓히기 · 다섯 칸 균등 분할 · 파란 채움 원은 XML에 없습니다.</b> 전부 모바일 CSS가 하는 일이라 <b>같은 XML이 PC에서는 단계마다 90</b>으로 보입니다.',
        '연결선(<code>pr_connector</code>)은 <b>결과 XML에 태그로 나가지 않습니다</b> — CSS가 단계 사이에 그립니다.',
      ],
    },
  },


];
