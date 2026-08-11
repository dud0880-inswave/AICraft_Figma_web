// 파트 III 컴포넌트 카탈로그.
// 항목 = 7칸. 앞 5칸은 펼쳐서, 뒤 2칸은 접어서 렌더된다(app.js renderItem):
//   펼침: 정의 / 완성 모습 / 만드는 법 / 주의사항 / 그려도 안 나가는 것
//   접힘: 변환 결과 XML(개발자 대조용) / 치수·색(템플릿 룩 재현용)
// ※ xmlOut은 계속 필수로 채운다(verify.mjs REQUIRED). 다만 행동을 바꾸는 문장은
//   접힌 칸에 두지 말고 build.points·pitfalls·limits로 올린다 — 접힌 칸은 잘 안 읽힌다.
// ※ build.tree에는 결과에 실리는 사이징만 적는다(Fixed/FILL·col_fix 폭·라벨셀 폭).
//   gap·padding·정렬은 결과에 안 실리므로 적지 않는다(5장과 모순되게 읽힌다).

window.REGISTRY = [
  {
    chapter: 6, index: 1, id: 'split',
    name: '분할 레이아웃 (split)',
    summary: '화면의 한 영역을 좌우로 분할해 서로 다른 내용을 병렬 배치하는 레이아웃.',
    capture: 'img/split.png',
    captureNote: 'Figma 템플릿 1864:7470 · 1540×115',
    figmaNodeId: '1864:7470',

    build: {
      tree: `split_group_lybox        가로 · 가로FILL
├ panel1_group           가로FILL
│  ├ tit1_group_titbox
│  │  ├ title_bar        (장식 — 매핑 안 됨)
│  │  └ title_textbox_tit_main
│  └ grid1_group_gvwbox
│     └ data1_gridview   헤더행 1 + 바디행 2(자세한 내용은 11장)
└ panel2_group           (panel1_group과 완전히 동일한 구조)`,
      points: [
        {
          t: '컨테이너의 세 번째 조각에 <code>lybox</code> 지정',
          d: '<code>split_group_lybox</code>와 같이 그룹 레이어 이름의 세 번째 조각(클래스 자리)에 <code>lybox</code>를 지정하면 하위 항목이 분할 배치됩니다.',
        },
        {
          t: '방향 미지정 시 기본값은 가로',
          d: '<code>lybox</code>만 지정하고 <code>horizontal</code>·<code>vertical</code>을 지정하지 않으면 <b>가로로 분할됩니다.</b> split은 기본값을 그대로 사용한 사례입니다.',
        },
        {
          t: '패널은 클래스 없는 그룹도 가능',
          d: '<code>panel1_group</code>·<code>panel2_group</code>은 클래스를 지정하지 않았으므로 결과에도 class 없는 그룹으로 출력됩니다. <code>lybox</code>의 직속 하위 항목이면 패널로 처리되며, 패널 내부에 배치할 컴포넌트에는 제약이 없습니다. ' +
             '단 <b>클래스를 지정하지 않으면 내부 컴포넌트도 class 없이 출력됩니다.</b> 본 템플릿의 그리드(<code>data1_gridview</code>)는 세 번째 조각이 없어 결과에 class가 적용되지 않았으며, 셔틀의 그리드(<code>shHA_gridview_gvw</code> → <code>gvw</code>)와 대비되는 사례입니다.',
        },
        {
          t: '패널 비율은 <code>col_2</code>~<code>col_9</code>로 지정',
          d: '패널 폭은 <b>클래스가 결정합니다.</b> <b>7:3 비율이 필요한 경우 각 패널 이름 끝에 <code>col_7</code>·<code>col_3</code>을 지정합니다.</b> ' +
             '숫자는 상대 비율이므로 합계가 10일 필요는 없습니다(<code>col_2</code>+<code>col_1</code>은 2:1로 적용됩니다). px 단위 고정폭이 필요한 경우에만 다음 항목의 <code>col_fix</code>를 사용합니다.',
        },
        {
          t: '패널 순서는 레이어 순서를 따름',
          d: '좌측 패널을 먼저, 우측 패널을 이후 순서로 배치합니다. 캔버스상 위치와 무관하게 레이어 패널의 순서가 좌우 배치 순서를 결정합니다(4장 공통 규칙).',
        },
      ],
    },

    xmlOut: {
      note: '그리드(gvwbox 내부) 세부 규칙은 11장에서 다룹니다. 본 항목에서는 구조 확인을 위해 축약해 표기했습니다.',
      code: `<xf:group class="lybox">
  <xf:group>
    <xf:group class="titbox">
      <w2:textbox class="tit_main" label="타이틀"> … </w2:textbox>
    </xf:group>
    <xf:group class="gvwbox">
      <w2:gridView style="height:153px;" autoFit="allColumn" …> … </w2:gridView>
    </xf:group>
  </xf:group>
  <xf:group>
    <xf:group class="titbox"> … </xf:group>
    <xf:group class="gvwbox"> … </xf:group>
  </xf:group>
</xf:group>`,
      points: [
        '패널 그룹(<code>panel1_group</code> 등)은 class 없이 <code>&lt;xf:group&gt;</code>으로 출력됩니다.',
        '<code>lybox</code>에는 방향 클래스가 지정되어 있지 않습니다. 방향 클래스의 부재가 기본값(가로)을 의미합니다.',
      ],
    },

    pitfalls: [
      '<b>병렬 배치할 두 패널은 <code>lybox</code> 그룹으로 묶습니다.</b> 가로 배치를 전달하는 수단은 <code>lybox</code>뿐입니다. Figma에서 가로로 배치해도 오토레이아웃 방향은 결과에 출력되지 않으므로(5장), 해당 그룹이 없으면 세로로 배치됩니다.',
      '<b>패널 폭은 클래스로 지정합니다</b> — 비율은 <code>col_2</code>~<code>col_9</code>, 고정폭은 <code>col_fix</code>를 사용합니다. 미지정 시 균등 분할됩니다.',
      '<b>패널이 3개 이상인 경우에도 규칙은 동일합니다.</b> 특정 패널만 확장하려면 해당 패널에만 <code>col_2</code> 이상을 지정합니다. 클래스 미지정 시 전체가 균등 분할됩니다.',
    ],

    limits: [
      '비율은 <code>col_2</code>~<code>col_9</code>의 정수 단위로만 지정할 수 있습니다. 55:45와 같은 세부 비율, 퍼센트, 최소·최대 폭은 지정할 수 없습니다.',
    ],

    codeRef: 'ConvertedCodeEditor.tsx · figma-style.ts',
  },

  {
    chapter: 6, index: 2, id: 'split-fixed',
    name: '분할(고정) 레이아웃 (split-fixed)',
    summary: '분할 레이아웃과 구조가 동일하며, 한쪽 패널의 폭을 고정해 나머지 패널이 잔여 공간을 채우는 레이아웃.',
    capture: 'img/split-fixed.png',
    captureNote: 'Figma 템플릿 1864:7538 · 1540×115',
    figmaNodeId: '1864:7538',

    build: {
      tree: `split_group_lybox         가로 · 가로FILL
├ panel1_group_col_fix    폭 200(고정, Fixed 사이징)
│  ├ tit1_group_titbox
│  └ grid1_group_gvwbox   그리드(11장)
└ panel2_group            남은 폭 전부 (panel1과 동일 구조)`,
      points: [
        {
          t: '<code>col_fix</code>가 폭을 결과에 출력',
          d: '<code>panel1_group_col_fix</code>와 같이 이름 끝에 <code>col_fix</code>를 지정한 패널만 Figma 측정 폭(본 사례에서는 200)이 <code>style="width:200px"</code>로 출력됩니다. 5장에서 다룬 <b>네 가지 출력 대상</b> 중 하나입니다.',
        },
        {
          t: '나머지 패널은 별도 지정 불필요',
          d: '<code>col_fix</code>가 없는 패널(<code>panel2_group</code>)은 잔여 공간을 자동으로 채웁니다. Figma에서 1324로 작성한 경우에도 해당 값은 출력되지 않고 잔여 공간 전체를 사용합니다.',
        },
        {
          t: '고정 패널은 Fixed 사이징 필수',
          d: '<code>col_fix</code> 클래스가 지정되어 있어도 해당 패널의 가로 사이징이 <b>Fill</b>이면 폭이 출력되지 않습니다. 측정값 추출 시 Fill은 빈 값을 반환하기 때문입니다. <b>Fixed width</b>로 지정해야 합니다.',
        },
        {
          t: '고정 패널의 위치에는 제약 없음',
          d: '<code>col_fix</code>는 임의의 패널에 지정할 수 있습니다. 두 번째 패널 또는 복수 패널에 지정해도 해당 패널의 폭만 고정됩니다.',
        },
      ],
    },

    xmlOut: {
      note: '그리드 세부 규칙은 11장에서 다룹니다. 본 항목에서는 폭이 출력되는 위치 확인을 위해 축약해 표기했습니다.',
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
        '폭 값은 Figma 측정값을 정수 px로 반올림한 값입니다.',
      ],
    },

    pitfalls: [
      '<b><code>col_fix</code> 패널의 사이징은 Fixed로 지정합니다.</b> Fill로 지정하면 Figma 화면상 차이는 없으나 결과 <code>style</code>에 <code>width</code>가 출력되지 않습니다.',
      '<b><code>col_fix</code>는 <code>lybox</code> 직속 패널 이름에 지정합니다.</b> 하위 레이어에 지정하면 해당 레이어의 폭만 고정되며 패널 배치는 변경되지 않습니다.',
      '<b><code>col_fix</code>는 한쪽 패널에만 지정합니다.</b> 나머지 패널이 잔여 공간을 채웁니다. 양쪽 모두 고정할 경우 두 폭의 합이 <code>lybox</code> 폭과 일치하지 않으면 여백이 남거나 초과됩니다.',
    ],

    limits: [
      '폭은 px 정수값만 출력됩니다. 퍼센트 등의 상대값과 최소·최대 폭은 지정할 수 없습니다.',
    ],

    codeRef: 'ConvertedCodeEditor.tsx · figma-style.ts',
  },

  {
    chapter: 6, index: 3, id: 'shuttle-h',
    name: '셔틀(가로) (shuttle-h)',
    summary: '두 그리드 사이에 이동 버튼을 배치해 항목을 좌우로 이동시키는 레이아웃. lybox에 중앙 패널이 추가된 구조입니다.',
    capture: 'img/shuttle-h.png',
    captureNote: 'Figma 템플릿 1864:7594 · 1540×90',
    figmaNodeId: '1864:7594',

    build: {
      tree: `shuttleH_group_lybox horizontal      가로
├ shuttleHA_group_gvwbox             가로FILL
│  └ shHA_gridview_gvw               체크박스열+헤더열×3, 바디행 2(11장)
├ shuttleH_group_ly_btn              버튼을 세로로 쌓아 가운데 모으는 건 CSS가 합니다
│  ├ next_button_btn_cm right icon   아이콘 전용(텍스트 레이어 없음)
│  └ prev_button_btn_cm left icon    아이콘 전용(텍스트 레이어 없음)
└ shuttleHB_group_gvwbox             (shuttleHA_group_gvwbox와 완전히 동일한 구조)`,
      points: [
        {
          t: '패널에 제목 없이 그리드만 배치',
          d: '분할 레이아웃과 달리 셔틀 패널에는 <code>titbox</code>가 없으며 <code>gvwbox</code> 직속에 그리드만 배치됩니다. 「셔틀(가로)」 제목은 본 컴포넌트 외부의 별도 섹션 제목입니다. ' +
             '그리드 이름은 <code>shHA_gridview_gvw</code>와 같이 <b>세 번째 조각에 <code>gvw</code>를 지정해야</b> 그리드 전용 클래스가 적용됩니다. 미지정 시 split의 그리드와 같이 class 없이 출력됩니다.',
        },
        {
          t: '중앙에 <code>ly_btn</code> 패널 추가',
          d: '패널은 2개가 아니라 3개입니다. 중앙 패널에 <code>class="ly_btn"</code>을 지정하면 내부 버튼이 세로로 배치되고 중앙 정렬됩니다.',
        },
        {
          t: '셔틀에는 <code>horizontal</code> 지정 필수',
          d: '<code>lybox</code>는 <code>horizontal</code>이 없어도 기본값이 가로입니다(6.1 참조). 그럼에도 지정해야 하는 이유는 <b>해당 클래스가 중앙 <code>ly_btn</code>의 이동 버튼 스타일(세로 배치·중앙 정렬)을 활성화하기 때문</b>입니다. 미지정 시 버튼이 가로로 배치됩니다.',
        },
        {
          t: '이동 버튼은 아이콘 전용',
          d: '<code>next_button_btn_cm right icon</code>과 같이 내부에 텍스트 레이어가 없으면 라벨이 빈 값(<code>label=""</code>)으로 출력됩니다. 아이콘은 클래스(<code>right</code>/<code>left</code>)가 결정하며, 13장 버튼 규칙과 동일합니다.',
        },
      ],
    },

    xmlOut: {
      note: '그리드 세부 규칙은 11장에서 다룹니다. 본 항목에서는 3패널 구조와 ly_btn 버튼 확인을 위해 축약해 표기했습니다.',
      code: `<xf:group class="lybox horizontal">
  <xf:group class="gvwbox">
    <w2:gridView style="height:153px;" autoFit="allColumn" class="gvw" …> … </w2:gridView>
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
    <w2:gridView style="height:153px;" autoFit="allColumn" class="gvw" …> … </w2:gridView>
  </xf:group>
</xf:group>`,
      points: [
        '<code>ly_btn</code> 내부 버튼 두 개는 텍스트 하위 항목이 없어 라벨이 빈 값(<code>label=""</code>)으로 출력됩니다.',
        '하위 항목이 3개(그리드·ly_btn·그리드)이며, 패널이 2개인 분할 레이아웃과 구성이 다릅니다.',
      ],
    },

    pitfalls: [
      '<b><code>ly_btn</code>은 두 목록 사이의 레이어 순서에 배치합니다.</b> 순서는 캔버스 위치가 아니라 레이어 패널 순서를 따르므로(4장), 첫 번째 또는 마지막에 배치하면 버튼이 해당 위치에 출력됩니다.',
      '<b>이동 버튼 내부에는 텍스트 레이어를 배치하지 않습니다.</b> 「다음」·「이전」 등의 텍스트를 배치하면 아이콘 전용이 아닌 라벨 버튼으로 출력됩니다.',
    ],

    limits: [
      '이동 버튼 개수와 아이콘 종류는 클래스 조합(<code>btn_cm</code> + 변형 + <code>icon</code>)으로만 지정됩니다. 13장 규칙을 따르며 본 컴포넌트에서 추가로 지정할 수 있는 항목은 없습니다.',
      '좌우 목록의 항목 선택·이동 상태는 정적 XML의 표현 대상이 아닙니다.',
    ],

    codeRef: 'ConvertedCodeEditor.tsx',
  },

  {
    chapter: 6, index: 4, id: 'shuttle-v',
    name: '셔틀(세로) (shuttle-v)',
    summary: '셔틀(가로)와 동일한 구조를 상하로 전환한 레이아웃. 이동 버튼이 두 그리드 사이에 가로로 배치됩니다.',
    capture: 'img/shuttle-v.png',
    captureNote: 'Figma 템플릿 1864:7653 · 1540×220',
    figmaNodeId: '1864:7653',

    build: {
      tree: `shuttleV_group_lybox vertical       세로
├ shuttleVA_group_gvwbox            세로FILL
│  └ shVA_gridview_gvw              (11장)
├ shuttleV_group_ly_btn
│  ├ up_button_btn_cm up icon       아이콘 전용
│  └ down_button_btn_cm down icon   아이콘 전용
└ shuttleVB_group_gvwbox            (shuttleVA_group_gvwbox와 완전히 동일한 구조)`,
      points: [
        {
          t: '<code>vertical</code>은 배치 방향을 변경',
          d: '셔틀(가로)의 <code>horizontal</code>과 달리 <code>vertical</code>은 기본값(가로)을 세로로 변경하며, 하위 항목을 위에서 아래로 배치합니다.',
        },
        {
          t: '버튼은 방향 토큰만 변경',
          d: '<code>up_button_btn_cm up icon</code> / <code>down_button_btn_cm down icon</code>과 같이 클래스 변형만 <code>up</code>/<code>down</code>으로 지정하며, 구조는 셔틀(가로)의 <code>ly_btn</code>과 동일합니다.',
        },
        {
          t: '패널 순서는 위에서 아래로 적용',
          d: '셔틀(가로)의 좌→우 규칙과 동일하게, 레이어 패널의 하위 항목 순서가 위→아래 배치 순서로 적용됩니다.',
        },
      ],
    },

    xmlOut: {
      note: '그리드 세부 규칙은 11장에서 다룹니다. 셔틀(가로)와 하위 구조가 동일하며 class 값만 다릅니다.',
      code: `<xf:group class="lybox vertical">
  <xf:group class="gvwbox">
    <w2:gridView style="height:153px;" autoFit="allColumn" class="gvw" …> … </w2:gridView>
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
    <w2:gridView style="height:153px;" autoFit="allColumn" class="gvw" …> … </w2:gridView>
  </xf:group>
</xf:group>`,
      points: [
        '하위 항목 3개(그리드·<code>ly_btn</code>·그리드) 구조는 셔틀(가로)와 동일하며, <code>class</code> 값(<code>vertical</code>, <code>up</code>/<code>down</code>)만 다릅니다.',
        '그리드가 전체 폭(1540)을 사용하는 것은 세로 모드에서 패널이 전체 너비를 차지하기 때문이며, 그리드 자체 규칙(11장)은 동일합니다.',
      ],
    },

    pitfalls: [
      '<b>세로 셔틀은 <code>lybox</code> 이름에 <code>vertical</code>을 지정합니다.</b> 미지정 시 하위 항목이 가로로 배치되고 간격이 16으로 적용되며, <code>ly_btn</code>이 세로 모드 스타일을 적용받지 못해 버튼이 중앙 정렬되지 않습니다.',
      '<b>버튼 위치와 클래스를 함께 맞춥니다.</b> 위치(위=up, 아래=down)를 변경하면서 클래스를 유지하면 불일치가 발생합니다.',
    ],

    limits: [
      '셔틀(가로)와 동일하게 이동 버튼 종류와 개수는 13장 클래스 규칙 범위 내에서만 지정할 수 있습니다.',
      '두 그리드의 세로 비율(예: 위 60%·아래 40%)은 지정할 수 없습니다. 폭에는 <code>col_fix</code>·<code>col_2</code>~<code>col_9</code>가 있으나 높이에 대응하는 클래스는 없습니다.',
    ],

    codeRef: 'ConvertedCodeEditor.tsx',
  },
  {
    chapter: 7, index: 1, id: 'pgtbox',
    name: '페이지 타이틀 (pgtbox)',
    summary: '화면 상단에서 화면 제목과 현재 경로(브레드크럼)를 한 줄로 표시하는 영역.',
    capture: 'img/pgtbox.png',
    captureNote: 'Figma 템플릿 1864:7707 · 1540×24',
    figmaNodeId: '1864:7707',

    build: {
      tree: `pgt_group_pgtbox
├ pgttitle_textbox_pgt_tit           "화면타이틀"
└ rt_group_rt
   ├ bc_group_breadcrumb             변환기가 tagname="ul" 자동 부여
   │  ├ home_group_home              tagname="li" 자동 부여
   │  │  └ home_anchor               텍스트 없음(홈 아이콘은 CSS가 그림)
   │  ├ /                            (장식 — 매핑 안 됨, 구분자는 CSS가 그림)
   │  ├ depth1_group                 tagname="li" 자동 부여
   │  │  └ depth1_anchor             label "1Depth Menu"
   │  ├ /                            (장식 — 매핑 안 됨)
   │  ├ depth2_group                 (depth1_group과 동일 구조, label "2Depth Menu")
   │  ├ /                            (장식 — 매핑 안 됨)
   │  └ depth3_group                 tagname="li" 자동 부여
   │     └ depth3_span               앵커가 아니라 스팬, label "3Depth Menu"
   └ btnrt_group_rt
      └ fav_button_btn_cm fav icon   아이콘 전용(텍스트 레이어 없음)`,
      points: [
        {
          t: '<code>breadcrumb</code> 클래스 지정 시 목록 태그는 자동 추가',
          d: '<code>bc_group_breadcrumb</code>와 같이 그룹에 <code>breadcrumb</code> 클래스를 지정하면 해당 그룹은 <code>&lt;ul&gt;</code>로, <b>직속 하위 그룹</b>은 각각 <code>&lt;li&gt;</code>로 처리됩니다. <code>tagname</code>을 직접 지정할 필요가 없습니다.',
        },
        {
          t: '구분자(/)는 결과에 출력되지 않으나 Figma에는 작성',
          d: '뎁스 사이 <code>/</code> 텍스트 레이어는 매핑되지 않아 <b>결과에서 제외됩니다.</b> 실제 구분자는 CSS <code>li::after</code>가 생성하며 마지막 항목에는 적용되지 않습니다. ' +
             '단 <b>Figma에는 템플릿과 동일하게 작성합니다</b>(템플릿에도 3개가 작성되어 있습니다). 누락 시 캔버스에서 뎁스가 연결되어 경로로 식별되지 않습니다(21.5).',
        },
        {
          t: '홈 아이콘은 <code>home</code> 클래스가 결정',
          d: '첫 항목 그룹 이름에 <code>home</code>을 지정하면(<code>home_group_home</code>) CSS 배경 이미지로 홈 아이콘이 적용됩니다. 미지정 시 해당 영역이 비어 있는 상태로 출력됩니다.',
        },
        {
          t: '마지막 뎁스는 앵커가 아닌 스팬으로 지정',
          d: '<code>depth3_span</code>과 같이 마지막 항목만 컴포넌트를 앵커(<code>anchor</code>)가 아닌 스팬(<code>span</code>)으로 지정하면 클릭할 수 없는 현재 페이지 표시로 처리됩니다. 이전 뎁스는 모두 앵커(링크)로 지정합니다.',
        },
        {
          t: '즐겨찾기 버튼은 breadcrumb와 동일 레벨의 <code>rt</code>에 배치',
          d: '<code>btnrt_group_rt</code>와 같이 <code>breadcrumb</code> 그룹과 동일 레벨에 <code>rt</code> 그룹을 추가하고 내부에 <code>btn_cm fav icon</code> 버튼을 배치합니다. breadcrumb 그룹 내부에 배치하면 해당 버튼도 <code>&lt;li&gt;</code>로 처리됩니다.',
        },
      ],
    },

    xmlOut: {
      code: `<xf:group class="pgtbox">
  <w2:textbox class="pgt_tit" label="화면타이틀"></w2:textbox>
  <xf:group class="rt">
    <xf:group class="breadcrumb" tagname="ul">
      <xf:group class="home" tagname="li">
        <w2:anchor outerDiv="false"></w2:anchor>
      </xf:group>
      <xf:group tagname="li">
        <w2:anchor outerDiv="false">
          <xf:label><![CDATA[1Depth Menu]]></xf:label>
        </w2:anchor>
      </xf:group>
      <xf:group tagname="li">
        <w2:anchor outerDiv="false">
          <xf:label><![CDATA[2Depth Menu]]></xf:label>
        </w2:anchor>
      </xf:group>
      <xf:group tagname="li">
        <w2:span label="3Depth Menu"></w2:span>
      </xf:group>
    </xf:group>
    <xf:group class="rt">
      <w2:button class="btn_cm fav icon">
        <w2:textbox tagname="span" label=""></w2:textbox>
      </w2:button>
    </xf:group>
  </xf:group>
</xf:group>`,
      points: [
        '<code>tagname="ul"</code>·<code>tagname="li"</code>는 변환기가 추가한 값이며, 이름에 지정하지 않아도 결과에 출력됩니다.',
        '구분자 「/」는 XML에 출력되지 않습니다. 뎁스 그룹 4개(홈 포함)가 <code>li</code> 4개로 출력됩니다.',
        '마지막 뎁스만 <code>&lt;w2:span&gt;</code>이며 나머지는 <code>&lt;w2:anchor&gt;</code>입니다. 링크 여부는 이 태그로 구분됩니다.',
      ],
    },

    pitfalls: [
      '<b>구분자는 Figma에 작성하며, 결과에서 제외되는 것은 정상 동작입니다.</b> 작성한 텍스트는 매핑되지 않고 CSS가 뎁스 사이에 생성합니다(마지막 항목은 제외). 중복 출력되지 않습니다.',
      '<b>경로 그룹에는 <code>breadcrumb</code> 클래스를 지정합니다.</b> 미지정 시 일반 <code>&lt;xf:group&gt;</code>으로 출력되어 <code>ul</code>/<code>li</code> 전용 CSS(가로 배치·구분자·홈 아이콘)가 적용되지 않습니다.',
      '<b>첫 항목에는 <code>home</code> 클래스를 지정합니다.</b> 미지정 시 라벨 없는 앵커만 출력되어 해당 영역이 비어 있는 상태가 됩니다.',
    ],

    limits: [
      '<b>모바일로 전환하면 <code>breadcrumb</code> 영역이 제외됩니다.</b> PC 화면을 그대로 모바일로 변환해도 해당 영역은 규칙상 제외되며, 오류가 아닙니다.',
      '뎁스별 아이콘 지정이나 현재 뎁스 강조 등 항목별 스타일 차등 적용은 불가능합니다. 홈 아이콘(<code>home</code> 클래스)을 제외하면 전체가 동일한 스타일로 출력됩니다.',
    ],

    codeRef: 'ConvertedCodeEditor.tsx',
  },
  {
    chapter: 7, index: 2, id: 'tit-h3',
    name: '타이틀(h3) (tit-h3)',
    summary: '섹션 제목 앞에 막대 장식이 적용되는 titbox 내 최상위 제목 스타일. tit_main 클래스로 지정합니다.',
    capture: 'img/tit-h3.png',
    captureNote: 'Figma 템플릿 1864:7727 · 1540×24',
    figmaNodeId: '1864:7727',

    build: {
      tree: `tit3_group_titbox
├ titleft_group               (제목+막대 묶음)
│  ├ title_bar                (장식 — 매핑 안 됨, 막대는 tit_main::before CSS가 그립니다)
│  └ title_textbox_tit_main   "타이틀(h3)"
└ rt_group_rt
   ├ work1_button_btn_cm      "업무버튼"
   │  ├ bicon                 (장식 — 매핑 안 됨)
   │  │  └ ico_search         (숨김 상태이고 클래스에 icon 토큰도 없어 결과에 안 나갑니다)
   │  └ lbl_textbox           라벨 텍스트
   ├ work2_button_btn_cm      (work1_button_btn_cm과 동일 구조)
   └ tooltip_udc_tooltip      (장식 — 매핑 안 됨, 결과에 전혀 안 남습니다)`,
      points: [
        {
          t: '막대는 클래스가 생성',
          d: '제목 앞 막대는 <code>tit_main</code> 클래스의 CSS(<code>::before</code>)가 생성합니다. 디자이너는 <b><code>tit_main</code> 클래스만 지정합니다.</b> ' +
             '작성된 <code>title_bar</code> 레이어는 유지해도 무방하며, 매핑되지 않아 결과에 영향을 주지 않습니다.',
        },
        {
          t: '제목은 <code>titbox</code> 직속 또는 그룹 래핑 모두 가능',
          d: '<code>titleft_group</code>과 같이 클래스 없는 그룹으로 제목과 막대를 묶어도 결과에 영향이 없습니다. 해당 그룹은 빈 <code>&lt;xf:group&gt;</code>으로 출력됩니다. 우측에 버튼(<code>rt</code>)을 함께 배치하는 경우 그룹으로 묶는 방식이 정렬에 유리합니다.',
        },
        {
          t: '업무버튼은 아이콘 없이 텍스트만 출력',
          d: '<code>work1_button_btn_cm</code>과 같이 클래스에 <code>icon</code> 토큰이 없으면 내부에 아이콘 레이어(<code>bicon</code>)를 작성해도 텍스트만 출력됩니다. 아이콘 버튼이 필요한 경우 13장 규칙에 따라 클래스에 <code>icon</code>을 지정합니다.',
        },
      ],
    },

    xmlOut: {
      code: `<xf:group class="titbox">
  <xf:group>
    <w2:textbox class="tit_main" label="타이틀(h3)"></w2:textbox>
  </xf:group>
  <xf:group class="rt">
    <w2:button class="btn_cm">
      <w2:textbox tagname="span" label="업무버튼"></w2:textbox>
    </w2:button>
    <w2:button class="btn_cm">
      <w2:textbox tagname="span" label="업무버튼"></w2:textbox>
    </w2:button>
  </xf:group>
</xf:group>`,
      points: [
        '<code>title_bar</code>·<code>tooltip_udc_tooltip</code>은 결과에 출력되지 않습니다. 막대는 CSS가 생성하며, 툴팁 레이어는 이름이 규격과 불일치해 매핑되지 않았습니다.',
        '제목을 래핑한 <code>titleft_group</code>은 class가 없어 빈 <code>&lt;xf:group&gt;</code>으로 출력됩니다.',
        '업무버튼 두 개 모두 <code>class="btn_cm"</code>만 적용되며 라벨은 작성한 텍스트가 그대로 출력됩니다. 아이콘은 출력되지 않습니다.',
      ],
    },

    pitfalls: [
      '<b>아이콘 적용에는 클래스의 <code>icon</code> 토큰이 필요합니다.</b> 아이콘 프레임(<code>bicon</code>) 작성만으로는 아이콘 버튼으로 처리되지 않습니다(13장).',
      '<b>우측 버튼 그룹에는 <code>rt</code> 클래스를 지정합니다.</b> 버튼의 우측 정렬은 Figma 정렬 설정이 아니라 해당 클래스가 결정하므로, 미지정 시 제목 옆에 배치됩니다.',
      '<b>툴팁 아이콘은 클래스 자리에 지정합니다.</b> 템플릿의 <code>tooltip_udc_tooltip</code>은 두 번째 조각이 <code>udc</code>이므로 매핑되지 않습니다. ' +
        '아이콘 영역을 유지하려면 <b>클래스 자리에</b> 지정해야 하며, 그룹 이름은 <code>tip_group_udc_tooltip</code>, 내부 버튼은 <code>tip_button_btn_tooltip</code> 형태로 작성합니다. ' +
        '단 <b>툴팁에 표시되는 문구는 전달되지 않습니다</b>(아래 참조).',
    ],

    limits: [
      '툴팁에 <b>표시되는 문구</b>는 전달할 수 없습니다. 문구는 화면 실행 후 채워지며, 아이콘 영역만 클래스로 전달됩니다(위 주의사항 참조).',
    ],

    codeRef: 'ConvertedCodeEditor.tsx',
  },
  {
    chapter: 7, index: 3, id: 'tit-h4',
    name: '타이틀(h4) (tit-h4)',
    summary: 'tit-h3보다 작은 하위 제목 스타일. 막대 대신 점 장식이 적용되며 tit_sub 클래스로 지정합니다.',
    capture: 'img/tit-h4.png',
    captureNote: 'Figma 템플릿 1864:7744 · 1540×24',
    figmaNodeId: '1864:7744',

    build: {
      tree: `tit4_group_titbox
├ titleft_group              (제목+점 묶음)
│  ├ dot                     (장식 — 매핑 안 됨, 점은 tit_sub::before CSS가 그림)
│  └ title_textbox_tit_sub   "타이틀(h4)"
└ rt_group_rt
   ├ work3_button_btn_cm     "업무버튼"
   └ work4_button_btn_cm     (work3_button_btn_cm과 동일 구조)`,
      points: [
        {
          t: 'h3와 h4의 구분 기준은 클래스',
          d: '레이어 구조는 tit-h3와 동일합니다. 결과를 구분하는 요소는 <b>텍스트박스 클래스가 <code>tit_main</code>인지 <code>tit_sub</code>인지</b>입니다. 폰트 크기(h3/h4)·굵기(700/600)·선행 장식(막대/점)은 모두 해당 클래스가 CSS로 결정합니다.',
        },
        {
          t: '점 장식도 CSS가 생성',
          d: '<code>dot</code> 레이어는 <code>title_bar</code>와 동일하게 처리됩니다. <code>tit_sub</code> 클래스의 <code>::before</code> CSS가 점 장식을 생성합니다.',
        },
        {
          t: '폰트 크기 조정으로는 h4가 되지 않음',
          d: 'Figma에서 폰트 크기를 축소해도 클래스가 <code>tit_main</code>이면 tit-h3와 동일한 크기로 출력됩니다. 크기를 결정하는 것은 측정 폰트 크기가 아니라 <b>클래스</b>입니다.',
        },
      ],
    },

    xmlOut: {
      code: `<xf:group class="titbox">
  <xf:group>
    <w2:textbox class="tit_sub" label="타이틀(h4)"></w2:textbox>
  </xf:group>
  <xf:group class="rt">
    <w2:button class="btn_cm">
      <w2:textbox tagname="span" label="업무버튼"></w2:textbox>
    </w2:button>
    <w2:button class="btn_cm">
      <w2:textbox tagname="span" label="업무버튼"></w2:textbox>
    </w2:button>
  </xf:group>
</xf:group>`,
      points: [
        'tit-h3의 XML과 구조가 동일하며, 차이는 <code>class="tit_main"</code>이 <code>class="tit_sub"</code>로 변경된 것뿐입니다.',
        '<code>dot</code> 레이어는 <code>title_bar</code>와 동일하게 결과에 출력되지 않습니다.',
        '버튼 구조와 라벨도 tit-h3와 동일하게 출력됩니다.',
      ],
    },

    pitfalls: [
      '<b>h4의 클래스는 <code>tit_sub</code>입니다.</b> <code>tit_main</code>으로 지정하면 Figma 화면과 무관하게 h3와 동일한 크기·굵기로 출력됩니다. 캔버스에서 식별되지 않으므로 철자를 확인합니다.',
      '<b>h4에서도 <code>rt</code>·<code>icon</code>을 h3와 동일하게 지정합니다.</b> 버튼 우측 정렬에는 <code>rt</code> 클래스가, 아이콘 적용에는 <code>icon</code> 토큰이 필요합니다(13장).',
    ],

    limits: [
      '툴팁에 표시되는 문구는 tit-h3와 동일하게 전달할 수 없으며, 아이콘 영역만 클래스로 전달됩니다.',
    ],

    codeRef: 'ConvertedCodeEditor.tsx',
  },
  {
    chapter: 8, index: 1, id: 'schbox',
    name: '조회영역 (schbox)',
    summary: '화면 상단에서 조회 조건을 입력받는 영역. 조건 필드와 조회 버튼으로 구성됩니다.',
    capture: 'img/schbox.png',
    captureNote: 'Figma 템플릿 1864:7762 · 1540×64',
    figmaNodeId: '1864:7762',

    build: {
      tree: `search_group_schbox           HUG
├ search_group_schbox_inner   가로FILL
│  └ cond_table_tbl           가로FILL
│     ├ row_tr_w2tb_tr        가로FILL
│     │  ├ cond_th            고정폭 80   ← 이 폭이 그 열의 컬럼 폭이 됩니다(5장)
│     │  │  ├ star            (장식 — 매핑 안 됨)
│     │  │  └ cond_textbox_req
│     │  ├ field_td           가로FILL
│     │  │  ├ cond_select     (폭은 안 실립니다 — 셀렉트는 언제나 100%)
│     │  │  ├ cond_select
│     │  │  └ search_button_btn_cm fill search
│     │  ├ cond_th
│     │  └ field_td
│     │     └ item_radio
│     └ row_tr_w2tb_tr        (2번째 행)
│        ├ cond_th
│        ├ field_td
│        │  ├ from_inputcalendar
│        │  ├ period_span     "~" 구분자
│        │  └ to_inputcalendar
│        ├ cond_th
│        └ field_td
│           ├ keyword_input
│           ├ at_span         "@" 구분자
│           └ cond_select
└ search_group_btn_schbox
   └ search_button_btn_cm fill search   오른쪽 끝 조회 버튼`,
      points: [
        {
          t: '행 이름은 <code>row_tr_w2tb_tr</code> 형식',
          d: '두 번째 조각 <code>tr</code>이 컴포넌트, 이후의 <code>w2tb_tr</code>이 클래스입니다. ' +
             '단 <b><code>w2tb_tr</code>은 변환기가 자동으로 추가하므로</b> 미지정 시에도 결과는 동일합니다. 템플릿과 동일한 이름을 사용하는 것을 권장합니다. ' +
             '표·셀도 동일하게 <b>지정하지 않은 클래스가 결과에 추가됩니다</b>(표는 <code>w2tb</code>가 선행 적용되어 <code>w2tb tbl</code>이 됩니다).',
        },
        {
          t: '어댑티브 표는 클래스를 직접 지정',
          d: '<code>w2tb_adaptive_layout</code>은 <b>자동 추가되지 않습니다.</b> 어댑티브로 적용하려면 표 레이어 이름을 ' +
             '<code>cond_table_tbl w2tb_adaptive_layout</code>으로 지정해야 합니다. ' +
             '일반 표와 <b>구조 및 표시 형태가 동일해</b> 캔버스에서는 누락을 식별할 수 없습니다.',
        },
        {
          t: '<code>th</code>·<code>td</code>는 단일 토큰으로 사용하지 않음',
          d: '레이어 이름을 <code>th</code>로만 지정하면 두 번째 조각이 없어 노드명 판정이 실패합니다. <code>cond_th</code>·<code>field_td</code>와 같이 <b>접두어를 지정합니다.</b>',
        },
        {
          t: '장식 레이어의 이름에는 제약 없음',
          d: '<code>star</code>·<code>val</code>·<code>ficon</code>·<code>circle</code>·<code>dot</code>은 컴포넌트 이름이 아니므로 매핑되지 않으며, 이는 의도된 동작입니다. 단 <b>컴포넌트 이름과 중복되지 않도록</b> 지정합니다.',
        },
        {
          t: '라벨셀만 고정폭, 그 외는 FILL',
          d: '<code>cond_th</code>는 고정폭(본 사례에서는 80), <code>field_td</code>·<code>table</code>·<code>tr</code>·<code>inner</code>는 가로 FILL로 지정합니다.',
        },
      ],
    },

    xmlOut: {
      note: '속성이 긴 항목(select의 allOption·direction 등)은 축약해 표기했습니다. 구조와 class는 실제 출력과 동일합니다.',
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
          <w2:button class="btn_cm fill search">
            <w2:textbox tagname="span" label="조회"></w2:textbox>
          </w2:button>
        </xf:group>
        <xf:group tagname="th" class="w2tb_th"> … </xf:group>
        <xf:group tagname="td" class="w2tb_td">
          <xf:select1 renderType="radiogroup" appearance="full"> … </xf:select1>
        </xf:group>
      </xf:group>

      <xf:group tagname="tr" class="w2tb_tr"> … </xf:group>

    </xf:group>
  </xf:group>
  <xf:group class="btn_schbox"> … </xf:group>
</xf:group>`,
      points: [
        '표·행·셀은 모두 <code>xf:group</code>에 <code>tagname</code> 속성이 적용된 형태로 출력되며, HTML의 <code>&lt;table&gt;</code>이 직접 출력되지 않습니다.',
        '버튼 라벨은 속성이 아니라 하위 <code>&lt;w2:textbox tagname="span"&gt;</code>으로 출력됩니다.',
        '<b>변환기 자동 생성 항목</b> — 표의 <code>&lt;colgroup&gt;</code>(라벨셀 폭 기준), 셀의 <code>&lt;w2:attributes&gt;</code> 블록, 행의 <code>w2tb_tr</code> 클래스이며, 위 코드에서는 생략했습니다.',
      ],
    },

    pitfalls: [
      '<b>어댑티브 표는 표 레이어 이름에 <code>w2tb_adaptive_layout</code>을 지정합니다.</b> 본 챕터에서 가장 빈번한 오류이며, 누락 시 일반 표로 변환되고 표시 형태가 동일해 확인이 지연됩니다.',
      '<b>셀렉트·인풋 내부는 Figma에 작성합니다</b> — 인수자가 확인하는 화면이기 때문입니다(21.5). 해당 하위 레이어는 명명 규칙을 적용하지 않아도 됩니다(4.2). 결과에는 <code>val</code>·<code>ficon</code>이 아니라 값 텍스트만 선택 항목으로 출력됩니다.',
      '<b>버튼 아이콘은 레이어가 아니라 클래스가 결정합니다</b> — <code>btn_cm fill search</code>의 <code>search</code>가 검색 아이콘을 적용합니다. Figma에 아이콘을 작성해도 XML에는 출력되지 않으며, 클래스가 일치하면 Figma에 없어도 화면에 표시됩니다.',
      '<b>라벨셀 폭은 XML에 출력됩니다</b> — 표의 <code>colgroup</code>이 th의 Figma 측정 폭으로 생성되므로, th 폭을 변경하면 결과가 변경됩니다.',
    ],

    limits: [
      '<b>표의 폭은 항상 <code>width:100%</code>로 출력됩니다.</b> 표에서 조정 가능한 값은 라벨셀 폭뿐입니다(5장).',
      '셀렉트는 변환기가 지정된 속성 세트로 출력하므로 <b>레이어 이름의 클래스가 출력되지 않습니다.</b>',
      '라디오는 항목 텍스트만 수집되며 <b>선택 상태는 전달할 수 없습니다.</b>',
    ],

    metrics: [
      { 대상: 'schbox',      배경: '#F9FAFB', 보더: '#A7B1BB 1px', radius: '6', 기타: 'padding 0 16 · gap 8' },
      { 대상: 'schbox_inner', 배경: '—',      보더: '—',            radius: '—', 기타: 'padding 4 0 · gap 8 · 가로 FILL' },
      { 대상: 'th (라벨셀)',  배경: '투명',    보더: '없음',          radius: '—', 기타: '고정폭 80 · padding 3 8' },
      { 대상: 'td (값셀)',   배경: '투명',    보더: '없음',          radius: '—', 기타: '가로 FILL · padding 3 4 · gap 4' },
      { 대상: '폼 필드',     배경: '#FFFFFF', 보더: '#C4CDD5 1px',  radius: '2', 기타: '높이 24' },
      { 대상: '버튼(fill)',  배경: '#454F5B', 보더: '#454F5B 1px',  radius: '4', 기타: '높이 24 · padding 0 8' },
    ],

    codeRef: 'convert-xml.ts · node-name-mapping.ts',
  },

  {
    chapter: 8, index: 2, id: 'schbox-adaptive',
    name: '조회영역 — 어댑티브',
    summary: '구조와 표시 형태는 8.1과 동일하며, 표 레이어 이름에 클래스가 하나 추가되는 것이 유일한 차이입니다.',
    capture: 'img/schbox-adaptive.png',
    captureNote: 'Figma 템플릿 1864:7833 · 1540×64 · 위 schbox 캡처와 픽셀 단위까지 같은 파일',
    figmaNodeId: '1864:7833',

    build: {
      tree: `search_group_schbox                        HUG                     (schbox와 동일)
├ search_group_schbox_inner                가로FILL                (동일)
│  └ cond_table_tbl w2tb_adaptive_layout   가로FILL   ← schbox와 다른 곳은 여기, 이름 끝의 이 토큰 하나뿐
│     ├ row_tr_w2tb_tr                     8.1의 1번째 행과 글자 하나 다르지 않습니다
│     └ row_tr_w2tb_tr                     8.1의 2번째 행과 글자 하나 다르지 않습니다
└ search_group_btn_schbox                  (동일)`,
      points: [
        {
          t: '표 레이어 이름 끝에 토큰 하나 추가',
          d: '<code>cond_table_tbl</code> 뒤에 공백으로 구분해 <code>w2tb_adaptive_layout</code>을 지정합니다. 버튼의 <code>btn_cm fill search</code>와 같이 ' +
             '<b>공백으로 복수 클래스를 나열하는 방식</b>입니다. 그 외 행·셀·필드 구조는 schbox와 <b>동일합니다.</b>',
        },
        {
          t: '해당 토큰은 자동 추가되지 않음',
          d: '동일 표의 <code>w2tb_tr</code>(행 클래스)은 미지정 시에도 변환기가 추가하지만, <b><code>w2tb_adaptive_layout</code>은 그렇지 않습니다.</b> ' +
             '표 레이어 이름에 직접 지정하지 않으면 결과에 출력되지 않습니다. 누락 시에도 변환은 오류 없이 완료되며 일반 표로 출력됩니다.',
        },
        {
          t: 'Figma상 차이는 없으나 결과는 상이',
          d: '본 항목의 캡처와 8.1의 캡처는 동일한 파일입니다. <b>Figma에서 육안으로는 해당 클래스의 누락을 식별할 수 없습니다.</b> ' +
             '반면 결과 화면에서는 배치가 명확히 구분됩니다 — 어댑티브 표는 <b>화면 폭과 무관하게 항상</b> 「라벨 + 값」 한 쌍씩 한 줄로 배치되며, ' +
             '라벨열이 150px로 고정됩니다(세부 배치 규칙은 10장 참조).',
        },
        {
          t: '토큰은 표 레이어에만 지정',
          d: '조회영역 외부 그룹(<code>schbox</code>·<code>schbox_inner</code>)이나 행·셀 이름에 지정하면 적용되지 않습니다. ' +
             '표로 매핑되는 레이어(<code>cond_table_tbl</code>)에만 지정합니다.',
        },
      ],
    },

    xmlOut: {
      note: '구조는 schbox 항목의 XML과 표 태그 한 줄만 다릅니다(<code>class</code>에 <code>w2tb_adaptive_layout</code> 추가). ' +
            '나머지는 schbox의 표기를 그대로 사용했으며, 두 표는 해당 속성 외에 차이가 없습니다.',
      code: `<xf:group class="schbox">
  <xf:group class="schbox_inner">
    <xf:group tagname="table" class="w2tb tbl w2tb_adaptive_layout" style="width:100%;">

      <xf:group tagname="tr" class="w2tb_tr">
        <xf:group tagname="th" class="w2tb_th">
          <w2:textbox class="req" label="조회조건"></w2:textbox>
        </xf:group>
        <xf:group tagname="td" class="w2tb_td">
          <xf:select1 appearance="minimal" style="width:100%;"> … </xf:select1>
          <xf:select1 appearance="minimal" style="width:100%;"> … </xf:select1>
          <w2:button class="btn_cm fill search">
            <w2:textbox tagname="span" label="조회"></w2:textbox>
          </w2:button>
        </xf:group>
        <xf:group tagname="th" class="w2tb_th"> … </xf:group>
        <xf:group tagname="td" class="w2tb_td">
          <xf:select1 renderType="radiogroup" appearance="full"> … </xf:select1>
        </xf:group>
      </xf:group>

      <xf:group tagname="tr" class="w2tb_tr"> … </xf:group>

    </xf:group>
  </xf:group>
  <xf:group class="btn_schbox"> … </xf:group>
</xf:group>`,
      points: [
        '변경 대상은 표의 <code>class</code> 속성 하나이며, <code>w2tb tbl</code>에서 <code>w2tb tbl w2tb_adaptive_layout</code>로 변경됩니다. 그 외는 schbox와 동일합니다.',
        '행·셀·필드는 schbox와 동일하게 출력됩니다. 어댑티브 적용 시에도 셀 구조 변경이나 속성 추가는 없으며, 동일 구조의 화면 배치는 해당 클래스가 결정합니다.',
      ],
    },

    pitfalls: [
      '<b>전달 전 결과 XML에서 표 태그의 <code>class</code>에 <code>w2tb_adaptive_layout</code>이 포함되었는지 확인합니다</b>(아래 접힌 XML 참조). 해당 클래스가 누락되어도 변환은 오류 없이 완료되고 Figma 화면에도 경고가 표시되지 않으므로, 이 방법으로만 확인할 수 있습니다.',
      '<b>어댑티브 적용 여부는 표 레이어의 클래스로만 결정됩니다.</b> 제목 텍스트에 「어댑티브」를 표기해도 적용되지 않습니다. 제목이 「조회테이블 (어댑티브)」이나 클래스가 누락되어 일반 표로 변환된 사례가 있습니다.',
      '<b><code>w2tb_adaptive_layout</code>은 표로 매핑되는 레이어 이름에만 지정합니다.</b> <code>schbox</code>·<code>schbox_inner</code> 그룹이나 행·셀에 지정하면 적용되지 않습니다.',
    ],

    limits: [
      '접힌 배치(라벨-값 한 쌍씩 세로 배치)는 Figma 캔버스에서 확인할 수 없습니다. 해당 클래스는 CSS로만 동작하므로 결과 화면에서만 확인됩니다.',
      '어댑티브에서는 라벨열이 <b>150px로 고정</b>되며, 5장의 라벨셀 폭이 컬럼 폭이 되는 규칙은 적용되지 않습니다(10장 참조).',
      'schbox의 제약이 동일하게 적용됩니다 — 셀렉트·인풋 내부 텍스트 미반영, 라디오 선택 상태 미반영, 표 <code>style</code>의 <code>width:100%</code> 고정 등(8.1 참조).',
    ],

    codeRef: 'node-name-mapping.ts · ConvertedCodeEditor.tsx',
  },

  {
    chapter: 9, index: 1, id: 'tab-basic',
    name: '기본탭 (tab-basic)',
    summary: '하나의 영역을 여러 장으로 분할해 전환하는 컴포넌트. 9장의 나머지 여섯 항목은 본 구조에서 한 지점만 변경한 형태입니다.',
    capture: 'img/tab-basic.png',
    captureNote: 'Figma 템플릿 1864:7904 · 1540×67',
    figmaNodeId: '1864:7904',

    build: {
      tree: `basic_group_tbcbox              ← 첫 조각 "basic"이 변형을 정합니다(이 항목은 변형 없음)
└ basic_tabcontrol_tbc
   ├ tabhost                    매핑 안 됨 — 변환기가 건너뛰고 안쪽에서 탭을 찾습니다
   │  ├ tab1_tabs               2번째 조각이 "tabs" → 탭 하나
   │  │  └ label                "탭1" ← 탭 라벨이 됩니다
   │  └ tab2_tabs … tab5_tabs   (같은 구조로 5개)
   └ content_group              이름에 "content" 포함 → 탭 본문
      └ content_textbox         "탭 컨텐츠 영역" ← 이 안은 실제로 변환됩니다`,
      points: [
        {
          t: '탭 하나는 두 번째 조각이 <code>tabs</code>인 프레임',
          d: '<code>tab1_tabs</code>와 같이 <b>두 번째 조각을 <code>tabs</code>로</b> 지정한 프레임이 탭 하나로 처리됩니다. 탭 라벨은 내부에서 <b>처음 확인되는 텍스트</b>를 사용합니다. ' +
             '텍스트가 없는 경우 라벨은 <code>탭1</code>·<code>탭2</code> 형태의 순번으로 자동 지정됩니다.',
        },
        {
          t: '<code>tabhost</code>는 결과에 출력되지 않으나 필수',
          d: '<code>tabhost</code>는 탭을 묶는 그룹입니다. 변환기는 탭 컨트롤 내부를 탐색할 때 해당 그룹을 건너뛰고 하위에서 탭을 찾으므로 결과에 출력되지 않습니다. ' +
             '<b>단 삭제하지 않습니다</b> — 해당 래퍼가 없으면 변환기가 어댑티브(아코디언)로 판정합니다(9.7 참조). ' +
             '<b>이름은 <code>tabhost</code>로 유지합니다.</b> 자동매핑 목록에는 <code>tab</code>이 매칭되어 탭 컨트롤로 표시되지만(2.3), 탭 컨트롤 내부에서는 해당 판정이 결과에 사용되지 않으므로 그대로 유지합니다.',
        },
        {
          t: '<b>탭 본문은 작성한 구조가 유지되는 유일한 위치</b>',
          d: '이름에 <code>content</code>가 포함된 그룹이 탭 본문이며, <b>내부 하위 항목이 변환되어 결과에 출력됩니다.</b> ' +
             '표·버튼·그리드를 배치하면 그대로 반영됩니다. <b>내부를 자체 방식으로 해석하는 컴포넌트</b>(달력·그리드·트리·아코디언·위젯 등) 중에서 ' +
             '작성한 구조가 유지되는 위치는 여기뿐입니다(4장 참조). 클래스만 지정된 일반 그룹·셀은 하위 항목을 그대로 통과시킵니다.',
        },
        {
          t: '본문을 탭 개수만큼 작성할 필요 없음',
          d: '본문 그룹이 탭 개수보다 적으면 <b>부족한 수만큼 빈 본문으로</b> 출력되며 오류가 아닙니다. 템플릿도 탭 5개에 본문 1개만 작성되어 있습니다. ' +
             '탭별로 다른 내용이 필요한 경우 이름에 <code>content</code>가 포함된 그룹을 해당 개수만큼 작성합니다.',
        },
        {
          t: '탭·본문의 <code>id</code>는 자동 부여',
          d: '<code>tabs1</code>·<code>content1</code> 형태의 <code>id</code>는 변환기가 순서대로 자동 부여하므로 레이어 이름에 지정할 필요가 없습니다.',
        },
      ],
    },

    xmlOut: {
      note: '참조 변환 결과(<code>완전본.xml</code>)를 그대로 인용했습니다. 탭 5개·본문 1개를 작성한 경우의 결과입니다.',
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
        '<code>tabhost</code> 그룹은 결과에 출력되지 않으며, 탭이 <code>tabControl</code> 직속으로 이동해 <code>&lt;w2:tabs&gt;</code>로 출력됩니다.',
        '본문 그룹(<code>content_group</code>)도 결과에 출력되지 않습니다. <code>&lt;w2:content&gt;</code>가 해당 위치를 대체하며 <b>내부 하위 항목만</b> 이관됩니다. 해당 그룹에 클래스를 지정해도 출력되지 않습니다.',
        '<code>&lt;w2:content&gt;</code>는 탭 개수(5개)만큼 생성되며, 작성하지 않은 4개는 빈 상태로 출력됩니다.',
      ],
    },

    pitfalls: [
      '<b>탭 이름의 두 번째 조각은 <code>tabs</code>로 지정합니다.</b> <code>tab</code>(단수)을 포함한 다른 값으로 지정하면 탭으로 인식되지 않습니다.',
      '<b>탭 내부에서 <code>content</code>는 본문 레이어에만 사용합니다</b>(2.4 참조). 장식용 그룹을 <code>content_bg</code>로 지정하면 해당 그룹도 본문으로 계산됩니다.',
      '<b>탭은 <code>tabhost</code> 하위에 배치합니다.</b> <code>tabhost</code>를 삭제하거나 이름을 변경해 탭을 탭 컨트롤 직속에 배치하면 어댑티브(아코디언)로 출력되어 형태가 달라집니다.',
      '<b>초기 선택할 탭을 첫 번째 위치에 배치합니다.</b> 첫 번째 탭이 항상 선택 상태로 출력되며, 선택 상태를 별도로 지정할 수 없습니다.',
    ],

    limits: [
      '탭별 아이콘 지정, 비활성 탭 지정, 개수 배지 적용은 불가능하며 라벨 텍스트만 전달됩니다.',
      '선택된 탭과 마우스 오버 상태의 색상은 클래스(CSS)가 결정합니다.',
    ],

    metrics: [
      { 대상: 'tbcbox',        배경: '—',       보더: '없음',                radius: '8', 기타: 'margin-bottom 16 · 옅은 그림자' },
      { 대상: 'tbc (탭 컨트롤)', 배경: '—',      보더: 'tab-type01 1px',      radius: '—', 기타: '' },
      { 대상: '탭 버튼',        배경: '회색(bg)', 보더: '오른쪽 구분선 1px',   radius: '—', 기타: '높이 28 · padding 0 20' },
      { 대상: '선택된 탭',      배경: 'primary-500', 보더: '—',              radius: '—', 기타: '글자색 반전' },
      { 대상: '본문 영역',      배경: '흰색',     보더: '위쪽 1px',            radius: '—', 기타: 'padding 16' },
    ],

    codeRef: 'ConvertedCodeEditor.tsx',
  },

  {
    chapter: 9, index: 2, id: 'tab-sub',
    name: '서브탭 (tab-sub)',
    summary: '기본탭의 하위 단계 탭. 박스 대신 밑줄로 표시되며 클래스 토큰 하나만 다릅니다.',
    capture: 'img/tab-sub.png',
    captureNote: 'Figma 템플릿 1864:7924 · 1540×90',
    figmaNodeId: '1864:7924',

    build: {
      tree: `sub_group_tbcbox           (기본탭과 동일)
└ sub_tabcontrol_tbc_sub   ← 기본탭과 다른 곳은 여기 하나뿐
   ├ tabhost               (동일)
   │  ├ subtab1_tabs
   │  │  └ label           "탭버튼 첫번째"
   │  └ subtab2_tabs
   │     └ label           "탭버튼 두번째"
   └ sub_content_group     이름에 "content" 포함 → 탭 본문 (동일)`,
      points: [
        {
          t: '<code>tbc</code>를 <code>tbc_sub</code>로 변경',
          d: '구조는 기본탭과 동일합니다. 탭 컨트롤 레이어 이름의 클래스 자리만 <code>tbc_sub</code>로 지정합니다. 7장의 <code>tit_main</code>/<code>tit_sub</code>와 동일한 방식입니다.',
        },
        {
          t: '형태는 CSS가 결정',
          d: '박스 테두리가 제거되고 선택된 탭 하단에 <b>2px 밑줄</b>이 적용되며 본문 여백도 변경됩니다. Figma에서 해당 형태를 직접 작성할 필요는 없으며 <b>클래스 지정으로 적용됩니다.</b>',
        },
        {
          t: '탭 개수에는 제한 없음',
          d: '템플릿에는 2개만 작성되어 있으나 개수 제한은 없습니다. 기본탭과 동일하게 <code>tabs</code> 프레임을 필요한 수만큼 추가합니다.',
        },
        {
          t: '변형 클래스와 위치 변형은 독립적으로 적용',
          d: '<code>tbc_sub</code>는 <b>형태</b>를 결정하는 클래스이며, 스크롤·위치·어댑티브는 <b>상위 <code>tbcbox</code>의 첫 조각</b>이 결정합니다(챕터 도입부 참조). 두 항목은 상호 간섭하지 않으므로 함께 사용할 수 있습니다.',
        },
      ],
    },

    xmlOut: {
      note: '기본탭의 결과와 <code>class</code> 한 곳, 탭 개수만 다릅니다.',
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
        '<code>class="tbc"</code>가 <code>class="tbc_sub"</code>로 변경된 것 외에는 기본탭과 구조가 동일합니다.',
        '변형 속성(<code>tabPosition</code>·<code>tabScroll</code>·<code>adaptive</code>)은 출력되지 않았습니다. 상위 이름의 첫 조각이 <code>sub</code>이므로 어느 변형에도 해당하지 않기 때문입니다.',
      ],
    },

    pitfalls: [
      '<b>서브탭 클래스는 <code>tbc_sub</code> 전체를 지정합니다.</b> <code>sub</code>만 지정하면 서브탭 CSS가 적용되지 않고 클래스 없는 탭으로 처리됩니다.',
      '<b>밑줄·구분선은 작성하지 않습니다.</b> 탭 내부에서 매핑되는 대상은 라벨 텍스트뿐입니다.',
      '<b>기본탭·서브탭을 복제해 사용할 때는 클래스와 형태를 함께 변경합니다.</b> 두 형태는 표시 결과가 명확히 다르므로 클래스만 변경하면 Figma 화면과 실제 결과가 불일치합니다.',
    ],

    limits: [
      '밑줄 두께와 색상은 CSS 고정값(2px)입니다.',
      '기본탭의 제약이 동일하게 적용됩니다 — 선택 상태·아이콘·배지·크기 미반영(9.1 참조).',
    ],

    metrics: [
      { 대상: 'tbc_sub',   배경: '투명',  보더: '없음',                  radius: '—', 기타: '' },
      { 대상: '탭 줄',     배경: '투명',  보더: '아래쪽 1px(전체 폭)',   radius: '—', 기타: '높이 24 · margin-bottom 12' },
      { 대상: '탭 버튼',   배경: '투명',  보더: '없음',                  radius: '—', 기타: 'padding 0 24' },
      { 대상: '선택된 탭', 배경: '투명',  보더: '아래쪽 2px(강조색)',    radius: '—', 기타: '글자색 진하게' },
      { 대상: '본문 영역', 배경: '흰색',  보더: '없음',                  radius: '6', 기타: 'padding 8 0 0' },
    ],

    codeRef: 'ConvertedCodeEditor.tsx',
  },

  {
    chapter: 9, index: 3, id: 'tab-scroll',
    name: '탭 스크롤 (tab-scroll)',
    summary: '탭 개수가 많아 한 줄에 표시되지 않을 때 좌우로 스크롤하는 탭. 탭마다 닫기(✕) 버튼이 함께 활성화됩니다.',
    capture: 'img/tab-scroll.png',
    captureNote: 'Figma 템플릿 1864:7938 · 1540×67',
    figmaNodeId: '1864:7938',

    build: {
      tree: `scroll_group_tbcbox             ← 첫 조각을 "scroll"로 짓는 것이 전부입니다
└ sc_tabcontrol_tbc             (기본탭과 동일)
   ├ tabhost                    (동일)
   │  └ tab1_tabs … tab5_tabs   (기본탭과 동일하게 5개)
   └ content_group              (동일)`,
      points: [
        {
          t: '상위 그룹 이름의 <b>첫 조각</b>을 <code>scroll</code>로 지정',
          d: '탭 컨트롤이 아니라 <b>상위 <code>tbcbox</code> 그룹</b>의 이름 첫 조각이 <code>scroll</code>일 때 스크롤 탭으로 처리됩니다 ' +
             '(<code>scroll_group_tbcbox</code>). 탭 컨트롤의 이름과 클래스는 기본탭과 동일하게 유지합니다.',
        },
        {
          t: '닫기 버튼이 함께 활성화',
          d: '스크롤로 판정되면 <code>tabScroll="true"</code>와 함께 <b><code>closable="true"</code>도 자동 적용됩니다.</b> 탭마다 ✕ 버튼이 생성되며 ' +
             '<b>두 속성을 개별적으로 제어할 수 없습니다.</b> 스크롤만 필요한 경우에도 닫기 버튼이 함께 적용됩니다.',
        },
        {
          t: '화살표·✕ 아이콘은 작성하지 않음',
          d: '좌우 스크롤 화살표와 탭의 ✕ 아이콘은 프레임워크가 생성하므로 별도로 작성하지 않습니다.',
        },
        {
          t: '스크롤 적용은 탭 개수와 무관',
          d: '스크롤 적용 여부는 <b>탭 개수와 무관하게</b> 이름으로만 결정됩니다. 템플릿에도 기본탭과 동일하게 5개만 작성되어 있으며, Figma 화면에서는 기본탭과 구분되지 않습니다.',
        },
      ],
    },

    xmlOut: {
      note: '기본탭 결과에 속성 두 개가 추가된 형태입니다.',
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

    pitfalls: [
      '<b>스크롤 탭은 <code>tbcbox</code> 그룹 이름의 첫 조각을 <code>scroll</code>로 지정합니다.</b> 누락 시 기본탭으로 변환되며, Figma 화면에서 두 항목의 차이가 없어 캔버스에서는 식별할 수 없습니다. 8장의 어댑티브 표와 동일한 유형입니다.',
      '<b><code>scroll</code>은 상위 <code>tbcbox</code> 그룹의 첫 조각에 지정합니다.</b> 탭 컨트롤 레이어(<code>sc_tabcontrol_tbc</code>)에 지정하면 적용되지 않습니다.',
      '<b>닫기 버튼이 불필요한 경우 스크롤 탭을 사용하지 않습니다.</b> 닫기 버튼은 스크롤과 함께 적용되며 해당 조합은 변경할 수 없습니다.',
    ],

    limits: [
      '스크롤과 닫기를 개별적으로 제어할 수 없습니다.',
      '스크롤 화살표의 형태·위치와 스크롤 단위는 지정할 수 없습니다.',
      '기본탭의 제약이 동일하게 적용됩니다(9.1 참조).',
    ],

    codeRef: 'ConvertedCodeEditor.tsx',
  },

  {
    chapter: 9, index: 4, id: 'tab-left',
    name: '탭(왼쪽) (tab-left)',
    summary: '탭 영역을 상단이 아닌 좌측에 세로로 배치한 탭. 상위 이름의 첫 조각을 left로 지정합니다.',
    capture: 'img/tab-left.png',
    captureNote: 'Figma 템플릿 1864:7958 · 1540×140',
    figmaNodeId: '1864:7958',

    build: {
      tree: `left_group_tbcbox               ← 첫 조각 "left"가 탭 위치를 정합니다
└ lf_tabcontrol_tbc
   ├ tabhost                    ★ 반드시 있어야 합니다 — 없으면 어댑티브로 넘어가 위치가 무시됩니다
   │  └ tab1_tabs … tab5_tabs   (세로로 쌓아 그립니다)
   └ content_group              탭 본문 — 오른쪽에 놓고 그립니다`,
      points: [
        {
          t: '첫 조각 <code>left</code>가 위치를 결정',
          d: '<code>left_group_tbcbox</code>와 같이 상위 그룹 이름의 첫 조각을 <code>left</code>로 지정하면 <code>tabPosition="left"</code>가 출력됩니다. ' +
             '사용 가능한 값은 <code>left</code>·<code>right</code>·<code>bottom</code> 세 가지이며, 상단은 기본값이므로 지정하지 않습니다.',
        },
        {
          t: '<b><code>tabhost</code>가 없으면 위치가 적용되지 않음</b>',
          d: '변환기는 탭이 탭 컨트롤 <b>직속</b>에 있으면 어댑티브로 판정하며, <b>어댑티브로 판정되면 <code>tabPosition</code>이 출력되지 않습니다.</b> ' +
             '이름을 <code>left_…</code>로 지정해도 <code>tabhost</code> 래퍼가 없으면 좌측 배치가 적용되지 않습니다. 위치 변형에서는 해당 래퍼가 필수입니다.',
        },
        {
          t: 'Figma 배치는 결과에 영향 없음',
          d: '위치는 이름이 결정하므로 Figma 배치는 결과를 변경하지 않습니다. 단 <b>탭을 좌측에, 본문을 우측에</b> 배치하는 것을 권장합니다. ' +
             '인수자가 캡처만으로 변형 종류를 식별할 수 있어야 검수가 가능하기 때문입니다.',
        },
      ],
    },

    xmlOut: {
      note: '기본탭 결과에 <code>tabPosition</code>이 추가된 형태입니다.',
      code: `<xf:group class="tbcbox">
  <w2:tabControl class="tbc" tabPosition="left">
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
        '<code>tabPosition="left"</code>만 추가되며 탭·본문 구조는 기본탭과 동일합니다.',
        '<code>adaptive</code> 속성이 없다는 것은 <code>tabhost</code> 래퍼가 정상 적용되었음을 의미합니다. 두 속성은 결과에 함께 출력되지 않습니다.',
      ],
    },

    pitfalls: [
      '<b><code>tabhost</code>를 유지합니다.</b> 삭제 시 어댑티브 판정이 위치보다 우선 적용되어 <code>tabPosition</code>이 출력되지 않습니다. 본 챕터에서 가장 빈번한 오류입니다.',
      '<b><code>left</code>는 상위 <code>tbcbox</code> 그룹의 첫 조각에 지정합니다.</b> 탭 컨트롤 레이어 이름에 지정하면 적용되지 않습니다.',
      '<code>top</code>·<code>up</code> 등의 값은 인식되지 않습니다. 상단 탭은 값을 지정하지 않습니다.',
    ],

    limits: [
      '위치는 <code>left</code>·<code>right</code>·<code>bottom</code> 세 가지로 한정됩니다.',
      '기본탭의 제약이 동일하게 적용됩니다(9.1 참조).',
    ],

    codeRef: 'ConvertedCodeEditor.tsx',
  },

  {
    chapter: 9, index: 5, id: 'tab-right',
    name: '탭(오른쪽) (tab-right)',
    summary: '탭 영역을 우측에 세로로 배치한 탭. left와 규칙이 동일하며 레이어 순서만 반대입니다.',
    capture: 'img/tab-right.png',
    captureNote: 'Figma 템플릿 1864:7978 · 1540×140',
    figmaNodeId: '1864:7978',

    build: {
      tree: `right_group_tbcbox   ← 첫 조각 "right"
└ rt_tabcontrol_tbc
   ├ content_group   ← 본문을 먼저 두었습니다(왼쪽에 보이므로)
   └ tabhost         ★ 필수 — 탭 줄을 나중에 두어 오른쪽에 보이게 합니다
      └ tab1_tabs … tab5_tabs`,
      points: [
        {
          t: '규칙은 <code>left</code>와 동일',
          d: '상위 그룹 이름의 첫 조각만 <code>right</code>로 지정하면 <code>tabPosition="right"</code>가 출력됩니다. <code>tabhost</code>가 필수인 점도 동일합니다.',
        },
        {
          t: '레이어 순서를 반대로 배치',
          d: '템플릿은 <b>본문을 먼저, <code>tabhost</code>를 이후에</b> 배치했습니다. 화면에서 좌측에 본문, 우측에 탭 영역이 표시되도록 맞춘 구성입니다. ' +
             '<b>결과는 변경되지 않으며</b>(위치는 이름이 결정), 캡처를 실제 표시 형태와 일치시키기 위한 배치입니다.',
        },
        {
          t: '순서 변경 시에도 탭은 정상 수집',
          d: '변환기는 하위 항목을 순서대로 탐색해 탭과 본문을 각각 수집하므로, <code>tabhost</code>가 뒤에 배치되어도 <code>&lt;w2:tabs&gt;</code>가 <code>&lt;w2:content&gt;</code>보다 <b>앞에</b> 출력됩니다.',
        },
      ],
    },

    xmlOut: {
      note: 'Figma에서는 본문을 먼저 배치했으나 결과에서는 탭이 먼저 출력됩니다.',
      code: `<xf:group class="tbcbox">
  <w2:tabControl class="tbc" tabPosition="right">
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
        '<code>tabPosition="right"</code> 외에는 <code>left</code>와 결과가 동일합니다.',
        '<b>Figma 레이어 순서(본문 → 탭)와 결과 순서(탭 → 본문)가 다릅니다.</b> 탭 컨트롤 내부에서는 4장의 레이어 순서 규칙이 적용되지 않으며, 변환기가 탭과 본문을 각각 수집해 지정된 순서로 구성합니다.',
      ],
    },

    pitfalls: [
      '<b><code>tabhost</code>를 유지합니다.</b> 삭제 시 <code>tabPosition</code>이 출력되지 않습니다(<code>left</code>와 동일).',
      'Figma에서 본문과 탭 영역의 순서를 변경해 위치를 조정할 수 없습니다. 위치는 상위 이름의 첫 조각이 결정합니다.',
      '<b><code>right</code>를 지정한 경우 Figma에도 탭을 우측에 배치합니다.</b> 불일치 시 캡처와 실제 결과가 달라 검수에 혼선이 발생합니다.',
    ],

    limits: [
      '세로 탭의 폭은 CSS 고정값입니다(9.4와 동일).',
      '기본탭의 제약이 동일하게 적용됩니다(9.1 참조).',
    ],

    codeRef: 'ConvertedCodeEditor.tsx',
  },

  {
    chapter: 9, index: 6, id: 'tab-bottom',
    name: '탭(아래쪽) (tab-bottom)',
    summary: '탭 영역을 본문 하단에 가로로 배치한 탭. 첫 조각을 bottom으로 지정합니다.',
    capture: 'img/tab-bottom.png',
    captureNote: 'Figma 템플릿 1864:7998 · 1540×67',
    figmaNodeId: '1864:7998',

    build: {
      tree: `bottom_group_tbcbox             ← 첫 조각 "bottom"
└ bm_tabcontrol_tbc
   ├ content_group              ← 본문을 먼저(위에 보이므로)
   └ tabhost                    ★ 필수 — 탭 줄을 나중에(아래에 보이게)
      └ tab1_tabs … tab5_tabs   (가로로 나란히)`,
      points: [
        {
          t: '첫 조각을 <code>bottom</code>으로 지정',
          d: '<code>tabPosition="bottom"</code>이 출력됩니다. 탭 영역은 기본탭과 동일하게 <b>가로</b>로 배치되며 위치만 본문 하단으로 변경됩니다.',
        },
        {
          t: '<code>right</code>와 동일한 배치 방식',
          d: '본문을 먼저, <code>tabhost</code>를 이후에 배치해 Figma에서도 탭이 하단에 표시되도록 작성합니다. 결과 순서는 탭이 먼저입니다.',
        },
        {
          t: '높이는 기본탭과 동일',
          d: '가로 배치이므로 탭 높이(28px)와 본문 여백(16px)이 기본탭과 동일하며, 템플릿의 전체 높이 67px도 같습니다.',
        },
      ],
    },

    xmlOut: {
      code: `<xf:group class="tbcbox">
  <w2:tabControl class="tbc" tabPosition="bottom">
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
        '<code>tabPosition="bottom"</code> 외에는 기본탭과 결과가 동일합니다.',
        '결과는 탭이 먼저, 본문이 이후에 출력되며 Figma 레이어 순서와 반대입니다.',
      ],
    },

    pitfalls: [
      '<b><code>tabhost</code>를 유지합니다.</b> 삭제 시 <code>tabPosition</code>이 출력되지 않습니다(<code>left</code>·<code>right</code>와 동일).',
      '본문을 하단에 배치하는 것만으로는 하단 탭이 적용되지 않으며, 이름의 첫 조각이 <code>bottom</code>이어야 합니다.',
      '<b>하단 탭은 <code>bottom</code>으로 지정합니다.</b> <code>under</code>·<code>down</code>은 인식되지 않습니다.',
    ],

    limits: [
      '탭 영역과 본문 사이의 간격·구분선은 CSS 고정값입니다.',
      '기본탭의 제약이 동일하게 적용됩니다(9.1 참조).',
    ],

    codeRef: 'ConvertedCodeEditor.tsx',
  },

  {
    chapter: 9, index: 7, id: 'tab-adaptive',
    name: '탭(어댑티브 · 아코디언) (tab-adaptive)',
    summary: '좁은 화면에서 탭이 아코디언 형태로 전환되는 탭. 본 항목만 구조가 다르며 tabhost를 사용하지 않습니다.',
    capture: 'img/tab-adaptive.png',
    captureNote: 'Figma 템플릿 1864:8018 · 1540×212',
    figmaNodeId: '1864:8018',

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
          t: '<b><code>tabhost</code>를 사용하지 않는 것이 핵심</b>',
          d: '탭(<code>tabs</code> 프레임)을 <b>탭 컨트롤 직속</b>에 배치하면 어댑티브로 판정됩니다. 상위 이름의 첫 조각을 <code>adaptive</code>로 지정할 수도 있으나, ' +
             '<b>구조만으로도 적용됩니다.</b> 본 챕터에서 유일하게 이름이 아니라 <b>구조</b>가 변형을 결정하는 항목입니다.',
        },
        {
          t: '본문은 하나만 작성',
          d: '어댑티브에서만 <b>변환기가 첫 번째 본문을 나머지 탭에 복제합니다.</b> 템플릿에도 탭 5개에 본문 1개만 작성되어 있으며 결과에는 동일 내용이 5회 출력됩니다. ' +
             '탭별로 다른 내용이 필요한 경우 본문 그룹을 탭 개수만큼 작성합니다.',
        },
        {
          t: '화살표는 결과에 출력되지 않으나 Figma에는 작성',
          d: '<code>chevron</code> 등의 접기/펴기 화살표는 매핑되지 않아 <b>결과에서 제외되며</b>, 실제 화살표는 CSS가 생성합니다. ' +
             '단 <b>Figma에는 작성합니다.</b> 템플릿에도 탭마다 하나씩 작성되어 있으며, 누락 시 캔버스에서 기본탭과 구분되지 않습니다(21.5).',
        },
        {
          t: '탭 위치와는 병용 불가, 스크롤과는 병용 가능',
          d: '어댑티브로 판정되면 <code>tabPosition</code>은 <b>출력되지 않으므로</b> 위치 변형과 어댑티브를 함께 사용할 수 없습니다. ' +
             '반면 <code>tabScroll</code>은 별도로 판정되므로 병용할 수 있습니다.',
        },
        {
          t: '기준 폭은 1920px로 고정',
          d: '결과에 <code>adaptiveThreshold="1920"</code>이 함께 출력됩니다. <b>화면 폭이 1920px 미만이면 아코디언으로 렌더링되므로</b> ' +
             '일반적인 모니터 환경에서는 아코디언 형태로 표시됩니다. 해당 값은 변경할 수 없습니다.',
        },
      ],
    },

    xmlOut: {
      note: '탭 5개·본문 1개를 작성한 경우 <code>&lt;w2:content&gt;</code> 5개가 <b>동일한 내용으로</b> 출력됩니다. 복제된 결과이므로 원본 노드 정보도 동일합니다.',
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
        '<b><code>tabPosition</code>이 출력되지 않습니다.</b> 어댑티브와 함께 출력될 수 없습니다.',
        '본문 5개가 모두 동일한 내용입니다. 본문을 하나만 작성해도 되는 근거이며, <b>탭별로 다른 내용이 필요한 경우 개별 작성해야 하는 근거</b>이기도 합니다.',
      ],
    },

    pitfalls: [
      '<b>위치 변형에는 <code>tabhost</code>를 배치하고 어댑티브에는 배치하지 않습니다.</b> 위치 변형에서 <code>tabhost</code>가 누락되면 어댑티브로 판정되고, 어댑티브에 <code>tabhost</code>가 있으면 어댑티브로 판정되지 않습니다(첫 조각이 <code>adaptive</code>인 경우 제외). 두 구조는 상호 치환되지 않습니다.',
      '<b>확인은 브라우저에서 화면 폭을 축소해 수행합니다.</b> 본 변형은 화면 폭에 따라 런타임에 형태가 변경되므로 Figma 캔버스에서는 아코디언 형태가 표시되지 않습니다. 8장의 어댑티브 표와 동일합니다.',
      '<b>본문 개수는 탭 개수와 일치시킵니다.</b> 본문이 부족하면 첫 번째 본문이 복제되어 빈 상태가 아니라 의도와 다른 내용으로 채워집니다.',
    ],

    limits: [
      '기준 폭(1920px)은 변경할 수 없습니다.',
      '어댑티브와 탭 위치(<code>left</code>·<code>right</code>·<code>bottom</code>)는 병용할 수 없습니다.',
      '펼침 상태의 항목과 다중 펼침 가능 여부는 지정할 수 없습니다.',
      '기본탭의 제약이 동일하게 적용됩니다(9.1 참조).',
    ],

    codeRef: 'ConvertedCodeEditor.tsx',
  },

  {
    chapter: 10, index: 1, id: 'tblbox',
    name: '입출력 테이블 (tblbox)',
    summary: '라벨과 값을 대응시켜 표시하거나 입력받는 표. 조회영역과 표 구조가 동일하며 외부 컨테이너와 라벨열 폭이 다릅니다.',
    capture: 'img/tblbox.png',
    captureNote: 'Figma 템플릿 1864:8047 · 1540×60',
    figmaNodeId: '1864:8047',

    build: {
      tree: `io_group_tblbox                   ← 조회영역과 달리 inner 그룹이 없습니다
└ io_table_tbl                    가로FILL
   ├ row_tr_w2tb_tr               가로FILL
   │  ├ head_th                   고정폭 150   ← 이 폭이 그 열의 컬럼 폭이 됩니다(5장)
   │  │  ├ star                   (장식 — 매핑 안 됨)
   │  │  └ head_textbox           "테이블헤더"
   │  ├ field_td                  가로FILL
   │  │  ├ keyword_input          ← 한 셀에 요소가 둘이라 인풋에 잰 폭이 실립니다(5.2)
   │  │  └ cond_select            ← 셀렉트는 혼자든 아니든 언제나 100%
   │  ├ head_th                   고정폭 150
   │  └ field_td
   │     └ link_anchor            "Insert Text" — 링크도 값셀에 넣을 수 있습니다
   └ row_tr_w2tb_tr               (2번째 행)
      ├ head_th                   고정폭 150
      ├ field_td
      │  └ f_inputcalendar_base   ← 날짜 입력칸은 혼자여도 120px 고정입니다(5.2)
      ├ head_th                   고정폭 150
      └ field_td
         └ link_anchor            "Insert Text"`,
      points: [
        {
          t: '표 작성 규칙은 8장 조회영역과 동일',
          d: '행은 <code>row_tr_w2tb_tr</code>, 라벨셀은 <code>head_th</code>, 값셀은 <code>field_td</code>이며 <b>두 번째 조각이 <code>tr</code>·<code>th</code>·<code>td</code></b>이면 됩니다. ' +
             '접두어에는 제약이 없으며(8장은 <code>cond_th</code>), <code>th</code>와 같이 단일 단어로 지정하지 않는 규칙도 동일합니다.',
        },
        {
          t: '차이는 <b>외부 컨테이너</b>',
          d: '조회영역은 <code>schbox</code> + <code>schbox_inner</code> 두 겹으로 구성되지만, 입출력 테이블은 <b><code>tblbox</code> 한 겹</b>으로 구성합니다. ' +
             '조회 버튼 영역인 <code>btn_schbox</code>도 사용하지 않습니다. 표 외곽 테두리와 모서리는 <code>tblbox</code>가 CSS로 생성합니다.',
        },
        {
          t: '라벨열 폭 — 템플릿 기준 150px',
          d: '조회영역의 라벨셀은 80px이나 본 항목은 <b>150px</b>입니다. 조회 조건명보다 항목명이 길기 때문입니다. ' +
             '해당 폭은 <b>결과에 출력되는 네 가지 중 하나</b>이므로(5장) 작성한 폭이 그대로 컬럼 폭으로 적용됩니다.',
        },
        {
          t: '값셀에는 폼 필드 외에 링크·텍스트도 배치 가능',
          d: '<code>link_anchor</code>와 같이 앵커를 배치하면 클릭 가능한 링크로 출력됩니다. 입력용 외에 <b>표시 전용 표</b>로도 사용할 수 있습니다.',
        },
        {
          t: '셀 속성·열 너비 정의는 작성하지 않음',
          d: '헤더 여부(<code>scope</code>), 열 너비 정의(<code>colgroup</code>), 표 요약 블록은 <b>변환기가 자동 생성합니다</b>(4장). ' +
             '행의 <code>w2tb_tr</code> 클래스도 미지정 시 자동 추가됩니다.',
        },
      ],
    },

    xmlOut: {
      note: '변환기가 자동 생성하는 블록(<code>w2:attributes</code> · <code>colgroup</code> · <code>scope</code>)을 <b>생략하지 않고</b> 표기했습니다. 작성 대상이 아닌 항목을 확인하는 용도이며, 속성이 긴 셀렉트는 축약했습니다.',
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
        <w2:anchor outerDiv="false">
          <xf:label><![CDATA[Insert Text]]></xf:label>
        </w2:anchor>
      </xf:group>
    </xf:group>

    <xf:group tagname="tr" class="w2tb_tr"> … </xf:group>

  </xf:group>
</xf:group>`,
      points: [
        '<code>&lt;colgroup&gt;</code>의 <code>width:150px</code>는 <b>라벨셀(th)의 Figma 측정 폭</b>입니다. 값셀은 <code>style=""</code>로 비어 있어 잔여 폭을 분배받습니다(5.3).',
        '각 <code>th</code>의 <code>&lt;w2:scope&gt;row&lt;/w2:scope&gt;</code>와 표의 <code>&lt;w2:summary&gt;</code>는 <b>변환기가 생성한 값</b>입니다.',
        '표의 <code>style</code>은 항상 <code>width:100%</code>이며, Figma에서 작성한 폭은 출력되지 않습니다.',
        '한 셀에 요소가 두 개(인풋+셀렉트)이므로 <b>인풋에만</b> 측정 폭(<code>120px</code>)이 출력되었습니다. 셀렉트는 배치 조건과 무관하게 항상 <code>width:100%</code>입니다(5.2).',
        '<code>tblbox</code> 그룹에는 <code>style</code>이 출력되지 않으며, 컨테이너의 테두리·모서리·그림자는 CSS가 생성합니다.',
      ],
    },

    pitfalls: [
      '<b>입출력 테이블에는 <code>schbox_inner</code>를 사용하지 않습니다.</b> 조회영역 구조를 복제할 때 함께 포함되는 경우가 있으며, 유지 시 결과에 불필요한 그룹이 추가됩니다.',
      '<b>동일 열의 라벨셀은 모든 행에서 폭을 통일합니다.</b> 컬럼 폭 기준 행은 변환기가 자동 선택하므로, 행마다 폭이 다르면 적용될 값을 예측할 수 없습니다(5.3).',
      '<b>열 폭은 라벨셀(th)에서 조정합니다.</b> 값셀(td)을 조정해도 열 폭은 변경되지 않습니다(5.3).',
    ],

    limits: [
      '표의 폭은 항상 <code>width:100%</code>로 고정됩니다.',
      '셀 병합(가로·세로)은 변환기가 속성으로 생성하지만, 병합 대상과 범위는 Figma 레이어 구조로 표현해야 합니다. 셀을 시각적으로 넓게 작성하는 것만으로는 병합이 적용되지 않습니다.',
    ],

    metrics: [
      { 대상: 'tblbox',       배경: '—',       보더: '1px + 4px 링(::before)', radius: '8', 기타: 'margin-bottom 16 · 옅은 그림자' },
      { 대상: '표(w2tb tbl)', 배경: '—',       보더: '없음(상자가 대신 그림)',  radius: '—', 기타: 'width 100%' },
      { 대상: 'th (라벨셀)',  배경: '연회색',   보더: 'th 전용 색 1px',        radius: '—', 기타: '고정폭 150 · 높이 24 · padding 3 8' },
      { 대상: 'td (값셀)',    배경: '흰색',     보더: 'td 전용 색 1px',        radius: '—', 기타: '가로 FILL · 높이 24 · padding 3 4' },
    ],

    codeRef: 'ConvertedCodeEditor.tsx',
  },

  {
    chapter: 10, index: 2, id: 'tblbox-adaptive',
    name: '입출력 테이블 — 어댑티브',
    summary: 'Figma 작성 내용은 10.1과 동일하며, 표 이름에 클래스를 하나 추가하면 결과 배치가 달라집니다.',
    capture: 'img/tblbox-adaptive.png',
    captureNote: 'Figma 템플릿 1864:8088 · 1540×60 · 위 tblbox 캡처와 픽셀 단위까지 같습니다',
    figmaNodeId: '1864:8088',

    build: {
      tree: `io_group_tblbox                       (위와 동일)
└ io_table_tbl w2tb_adaptive_layout   ← 다른 곳은 여기, 이름 끝의 이 토큰 하나뿐입니다
   ├ row_tr_w2tb_tr
   │  ├ head_th                       고정폭 150
   │  │  ├ star                       (장식 — 매핑 안 됨)
   │  │  └ head_textbox_req           (필수 표시)
   │  ├ field_td
   │  │  └ keyword_input
   │  ├ head_th                       고정폭 150
   │  └ field_td
   │     └ link_anchor
   └ row_tr_w2tb_tr                   (2번째 행 — 위와 같은 구조)`,
      points: [
        {
          t: '표 레이어 이름 끝에 토큰 하나 추가',
          d: '<code>io_table_tbl</code> 뒤에 공백으로 구분해 <code>w2tb_adaptive_layout</code>을 지정합니다. 행·셀 구조는 <b>동일합니다.</b> ' +
             '8장의 조회영역 어댑티브와 같은 방식입니다.',
        },
        {
          t: '<b>결과 배치는 화면 폭과 무관하게 항상 변경</b>',
          d: '해당 클래스가 적용되면 표가 <b>「라벨 + 값」 한 쌍씩 한 줄</b>로 배치됩니다. 한 행에 라벨·값을 두 쌍(셀 4개) 작성해도 ' +
             '<b>두 줄로 분리되어</b> 출력됩니다. 화면 폭과 무관하며 1540px 환경에서도 동일합니다.',
        },
        {
          t: '라벨열 폭은 150px로 고정',
          d: '어댑티브에서는 변환기가 생성한 <code>colgroup</code>이 <b>CSS에서 무시되며</b>(<code>display:none</code>) 라벨열이 <b>항상 150px</b>로 고정됩니다. ' +
             '<b>5장의 라벨셀 폭이 컬럼 폭이 되는 규칙은 어댑티브 표에 적용되지 않습니다.</b> 라벨셀을 넓게 작성해도 150px로 출력됩니다.',
        },
        {
          t: '해당 토큰은 자동 추가되지 않음',
          d: '동일 표의 <code>w2tb_tr</code>은 미지정 시에도 변환기가 추가하지만, <b><code>w2tb_adaptive_layout</code>은 그렇지 않습니다.</b> ' +
             '표 레이어 이름에 직접 지정하지 않으면 출력되지 않으며, 누락 시에도 변환은 오류 없이 완료됩니다.',
        },
        {
          t: '토큰은 표 레이어에만 지정',
          d: '외부 <code>tblbox</code> 그룹이나 행·셀 이름에 지정하면 적용되지 않습니다. 표로 매핑되는 레이어에만 지정합니다.',
        },
      ],
    },

    xmlOut: {
      note: '10.1의 결과와 <b>표 태그의 <code>class</code>만</b> 다릅니다. 자동 생성 블록은 축약했습니다.',
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
        '변경 대상은 표의 <code>class</code>이며, <code>w2tb tbl</code>에서 <code>w2tb tbl w2tb_adaptive_layout</code>으로 변경됩니다.',
        '<b>결과 XML에서 어댑티브 적용 여부는 표 태그의 <code>class</code>로 확인합니다.</b> 그 외 속성·태그로는 구분할 수 없습니다.',
        '<code>colgroup</code>은 어댑티브에서도 생성되지만 CSS가 무시하므로 결과 화면에 반영되지 않습니다. XML에 포함되어 있어도 폭은 적용되지 않습니다.',
      ],
    },

    pitfalls: [
      '<b>전달 전 결과 XML에서 표 태그의 <code>class</code>를 확인합니다.</b> 해당 클래스가 누락되어도 변환은 오류 없이 완료되어 일반 표로 출력되며 경고가 표시되지 않습니다.',
      '<b>검수는 캔버스가 아니라 결과 XML에서 수행합니다.</b> 두 항목의 캡처는 동일한 파일이므로 차이는 결과에서만 확인됩니다.',
      '<b>한 행에는 라벨·값 한 쌍씩 배치합니다.</b> 두 쌍을 배치해도 어댑티브에서는 한 쌍씩 분리되므로, 병렬 배치가 필요하면 어댑티브를 사용하지 않습니다.',
      '<b>어댑티브를 사용하는 표에서는 라벨셀 폭 조정이 불필요합니다.</b> 라벨열이 150px로 고정되므로 작성 폭이 반영되지 않습니다.',
    ],

    limits: [
      '라벨열 폭(150px)은 변경할 수 없습니다. 어댑티브 CSS가 <code>colgroup</code>보다 우선 적용됩니다.',
      '한 줄에 라벨·값 두 쌍을 배치할 수 없습니다.',
      '어댑티브 배치는 Figma 캔버스에서 확인할 수 없으며 결과 화면에서만 확인됩니다.',
      'tblbox의 제약이 동일하게 적용됩니다 — 표 폭 100% 고정, 값셀 폭 미반영(10.1 참조).',
    ],

    codeRef: 'node-name-mapping.ts · ConvertedCodeEditor.tsx',
  },

  {
    chapter: 11, index: 1, id: 'grid',
    name: '그리드 (grid)',
    summary: '다량의 데이터를 행과 열로 표시하는 컴포넌트. 표(10장)와 달리 컬럼 개념이 있으며, 컬럼은 헤더 행에서 도출됩니다.',
    capture: 'img/grid.png',
    captureNote: 'Figma 템플릿 1864:8136 · 1540×180',
    figmaNodeId: '1864:8136',

    build: {
      tree: `data_group_gvwbox
└ data_gridview_gvw
   ├ header_row     ★ 이름에 "header" → 헤더 행. 이 행의 셀 개수가 컬럼 개수입니다
   │  ├ cell
   │  │  └ label    "타이틀" ← 컬럼 제목이 됩니다
   │  └ cell × 5    (같은 구조로 6개 = 컬럼 6개)
   ├ body_row       ★ 이름에 "row" → 데이터 행
   │  └ cell × 6    각 셀의 첫 텍스트가 그 칸의 데이터가 됩니다
   └ body_row × 4   (데이터 행은 몇 개든 그려도 됩니다)`,
      points: [
        {
          t: '<b>컬럼은 헤더 행이 결정</b>',
          d: '변환기는 하위 항목 중 <b>이름에 <code>header</code>가 포함된 첫 프레임</b>을 헤더 행으로 판정하고(없으면 첫 번째 하위 항목), ' +
             '<b>해당 행의 셀 개수를 컬럼 개수로</b> 적용합니다. 셀 내 첫 텍스트가 컬럼 제목이 됩니다. ' +
             '텍스트가 없는 아이콘 전용 셀도 <b>제목이 빈 컬럼으로 계산되며</b>, 컬럼 수는 셀 개수를 기준으로 합니다.',
        },
        {
          t: '데이터 행 이름에는 <code>row</code>가 포함되어야 함',
          d: '<code>body_row</code>와 같이 <b>이름에 <code>row</code>가 포함되고 <code>header</code>·<code>footer</code>는 포함되지 않은</b> 하위 항목만 데이터 행으로 인식됩니다. ' +
             '<code>line1</code>·<code>data2</code>와 같이 지정하면 <b>해당 행이 결과에서 제외되어</b> 작성한 데이터가 누락됩니다.',
        },
        {
          t: '셀 내 텍스트가 데이터로 출력',
          d: '각 데이터 행의 <code>i</code>번째 셀에서 처음 확인되는 텍스트가 결과 데이터로 출력되어 화면에 표시됩니다. ' +
             '더미 데이터가 별도로 생성되지 않으므로 <b>Figma에 작성한 텍스트가 초기 데이터가 됩니다.</b>',
        },
        {
          t: '컬럼 폭·그리드 높이는 변환기가 결정',
          d: '변환기가 <b>모든 컬럼 폭을 70px, 그리드 높이를 153px</b>로 적용합니다. 셀 폭이나 행 개수와 무관하게 동일한 값이 적용됩니다. ' +
             '<b>그리드에서 디자이너가 지정하는 대상은 컬럼 개수와 데이터 내용</b>이며 크기는 포함되지 않습니다.',
        },
        {
          t: '합계 행은 이름에 <code>footer</code>를 지정',
          d: '이름에 <code>footer</code>가 포함된 행을 배치하면 그리드 하단에 고정되는 합계 행(<code>&lt;w2:footer&gt;</code>)이 생성됩니다. ' +
             '해당 행의 셀 텍스트는 데이터가 아니라 <b>고정 표시값</b>으로 출력됩니다.',
        },
      ],
    },

    xmlOut: {
      note: '컬럼이 6개이므로 반복 부분을 <code>…</code>로 축약했습니다. 데이터 목록(<code>w2:dataList</code>)은 그리드 태그 외부의 별도 블록으로 출력되므로 생략했습니다.',
      code: `<xf:group class="gvwbox">
  <w2:gridView style="height:153px;" autoFit="allColumn" class="gvw"
               dataList="data:gridData_1864_8136">
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
        '<code>&lt;w2:header&gt;</code>는 컬럼 <b>정의</b>이며 <code>&lt;w2:gBody&gt;</code>는 각 컬럼의 <b>데이터 표시 방식</b>입니다. 데이터 행 개수와 무관하게 각각 한 세트만 출력됩니다.',
        '데이터 행에 작성한 텍스트는 해당 블록이 아니라 <b>별도의 <code>&lt;w2:dataList&gt;</code></b>에 <code>&lt;w2:row&gt;</code>로 출력되며, 그리드는 <code>dataList="data:…"</code>로 이를 참조합니다.',
        '모든 컬럼의 <code>width="70"</code>이 동일하며, Figma 측정 폭(257px)은 출력되지 않습니다.',
        '<code>&lt;w2:caption&gt;</code>의 값은 항상 <code>this is a grid caption.</code>입니다. 변환기가 적용하는 고정 문구이며 디자이너 지정 대상이 아닙니다.',
        '<code>dataList</code> 식별자는 노드 번호를 기준으로 자동 생성됩니다(<code>gridData_1864_8136</code>).',
      ],
    },

    pitfalls: [
      '<b>헤더 행 이름에는 <code>header</code>를 지정합니다.</b> 누락 시 첫 번째 하위 항목이 헤더로 처리되어 최상단 데이터 행이 컬럼 제목으로 적용되고 데이터에서 제외됩니다.',
      '<b>데이터 행 이름에는 <code>row</code>를 지정합니다.</b> 미지정 시 해당 행이 오류나 경고 없이 결과에서 제외됩니다. 데이터가 비어 있는 경우 우선 확인할 항목입니다.',
      '<b>헤더 셀과 데이터 셀의 개수를 일치시킵니다.</b> 컬럼 수는 헤더가 결정하므로 데이터 셀이 더 많으면 초과분이 제외되고, 적으면 빈 셀로 처리됩니다.',
      '<b>셀 이름에는 제약이 없습니다.</b> 행 이름만 <code>header</code>·<code>row</code>·<code>footer</code>에 맞추면 되며, 셀은 개수와 내부 텍스트만 참조합니다. 단 셀 <b>내부</b> 레이어 이름은 컬럼 종류를 결정하므로 11.2 규칙을 따릅니다.',
    ],

    limits: [
      '컬럼 폭(70px)과 그리드 높이(153px)는 지정할 수 없습니다.',
      '캡션 문구는 변경할 수 없습니다.',
      '컬럼 정렬(가운데·오른쪽), 컬럼 고정(스크롤 시 좌측 고정), 행 높이는 지정할 수 없습니다.',
      '<code>&lt;w2:caption&gt;</code>·<code>autoFit</code> 등의 속성은 변환기가 결정하며 디자이너 지정 대상이 아닙니다.',
    ],

    codeRef: 'ConvertedCodeEditor.tsx',
  },

  {
    chapter: 11, index: 2, id: 'grid-form',
    name: '그리드 폼 (grid-form)',
    summary: '셀에서 직접 입력·선택하는 그리드. 셀에 작성한 위젯은 형태가 아니라 컬럼 타입으로 환원됩니다.',
    capture: 'img/grid-form.png',
    captureNote: 'Figma 템플릿 1864:8250 · 1540×90',
    figmaNodeId: '1864:8250',

    build: {
      tree: `gf_group_gvwbox
└ gf_gridview_gvw
   ├ header_row                    셀 14개  → 컬럼 14개
   ├ body_row                      셀마다 위젯을 하나씩 그려 둡니다
   │  ├ cell
   │  │  └ input                   아이콘이 없습니다   → text 컬럼
   │  ├ cell
   │  │  └ input
   │  │     └ ico_select           → 셀렉트 컬럼
   │  ├ cell
   │  │  └ input
   │  │     └ ico_calendar         → 달력 컬럼
   │  ├ cell
   │  │  └ ico_radio               → 라디오 컬럼
   │  ├ cell
   │  │  └ ico_check               → 체크박스 컬럼
   │  ├ cell
   │  │  └ input
   │  │     └ ico_search           → 검색 이미지 컬럼
   │  └ cell
   │     └ input
   │        └ ico_spinner_updown   → 스피너 컬럼
   └ footer_row                    ★ 이름에 "footer" → 합계 행이 됩니다`,
      points: [
        {
          t: '<b>셀에 작성한 위젯은 아이콘 이름으로 판정</b>',
          d: '변환기는 컬럼 타입 판정 시 데이터 셀 내부의 <b>아이콘 레이어 이름</b>을 참조합니다 — ' +
             '<code>ico_check</code>→체크박스, <code>ico_radio</code>→라디오, <code>ico_select</code>→셀렉트, <code>ico_calendar</code>→달력, ' +
             '<code>ico_spinner</code>→스피너, <code>ico_search</code>→검색 이미지, <code>ico_drilldown</code>→계층(11.4). ' +
             '이름에 해당 조각이 <b>포함되기만 하면</b> 매칭되므로 <code>ico_spinner_updown</code>도 스피너로 판정됩니다. <b>레이어 이름만 참조하므로 자체 제작 아이콘 파일을 사용할 수 있습니다</b>(21.5).',
        },
        {
          t: '아이콘이 없는 경우 컬럼 제목을 참조',
          d: '변환기는 <b>컬럼 제목이 위젯 이름과 완전히 일치하는지</b> 우선 확인합니다 — <code>select</code>·<code>calendar</code>·<code>radio</code>·<code>checkbox</code>·' +
             '<code>button</code>·<code>link</code>·<code>textarea</code>·<code>spinner</code>·<code>autocomplete</code>·<code>checkcombobox</code>·<code>textimage</code>. ' +
             '제목이 한글인 경우(본 템플릿의 「선택」) <b>셀 내부 아이콘으로만 판정되며</b>, 제목으로 판정되려면 <code>select</code> 등 영문 위젯 이름과 완전히 일치해야 합니다.',
        },
        {
          t: '아이콘 대신 노드명으로도 판정 가능',
          d: '셀 내부 레이어 이름의 <b>두 번째 조각이 위젯 이름</b>인 경우(예: <code>check_checkbox_item</code>)에도 판정됩니다. ' +
             '아이콘 작성이 어려운 경우 사용하는 방식이며, 2장의 명명 규칙과 동일합니다.',
        },
        {
          t: '<b>그리는 기준선 — 셀마다 아이콘 하나</b>',
          d: '체크박스·셀렉트·버튼을 셀 안에 그려도 그 레이어가 XML에 실리지는 않습니다. <b>컬럼의 타입 한 글자로만 환원</b>되고, 실제 위젯은 프레임워크가 그립니다. ' +
             '<b>셀마다 판정용 아이콘(<code>ico_*</code>) 하나면 충분하고, 필요하면 입력칸 윤곽 하나만 더 둡니다.</b> ' +
             '그 이상은 결과에도 안 나가고 검수에도 쓰이지 않습니다.',
        },
        {
          t: '버튼·링크 컬럼은 셀 텍스트가 라벨로 적용',
          d: '컬럼 타입이 버튼 또는 링크인 경우 셀에 작성한 텍스트가 <b>데이터가 아니라 버튼 라벨</b>로 출력됩니다(대괄호는 자동 제거). ' +
             '해당 컬럼의 데이터 영역은 비어 있는 상태로 출력됩니다.',
        },
      ],
    },

    xmlOut: {
      note: '컬럼이 14개이므로 대표 항목만 표기하고 축약했습니다.',
      code: `<w2:gridView style="height:153px;" autoFit="allColumn" class="gvw" dataList="data:…">
  <w2:header> … 컬럼 제목 14개 … </w2:header>

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
        '셀에 작성한 위젯은 <code>inputType</code> 속성으로만 출력되며, 위젯 레이어 자체는 XML에 포함되지 않습니다.',
        '셀렉트 계열(<code>select</code>·<code>autoComplete</code>·<code>checkcombobox</code>)에는 <b><code>new row</code> 항목 3개가 고정으로</b> 출력되며, Figma에 작성한 선택 항목 텍스트는 사용되지 않습니다.',
        '검색 이미지 컬럼의 아이콘 경로와 크기도 고정값입니다.',
        '합계 행의 컬럼은 <code>footerCol0</code>부터 별도 번호가 부여되며 폭은 70px로 동일합니다.',
      ],
    },

    pitfalls: [
      '<b>컬럼 타입은 셀 내부 아이콘(<code>ico_*</code>) 또는 위젯 노드명으로 지정합니다.</b> 제목으로 판정되는 경우는 제목이 <code>select</code>·<code>calendar</code> 등 위젯 이름과 완전히 일치할 때뿐이며, 한글 제목으로는 판정되지 않습니다.',
      '<b>아이콘 레이어 이름에는 지정된 조각이 포함되어야 합니다</b> — <code>ico_check</code>·<code>ico_radio</code>·<code>ico_select</code>·<code>ico_calendar</code>·<code>ico_search</code>·<code>ico_spinner</code>·<code>ico_drilldown</code> 일곱 가지입니다. 해당 조각이 <b>이름에 포함되기만 하면</b> 매칭되므로 <code>ico_spinner_updown</code>과 같이 접미를 추가할 수 있습니다. <code>icon_check</code>·<code>check_icon</code>은 조각이 분리되어 매칭되지 않습니다.',
      '<b>셀 내부 셀렉트는 외형만 작성합니다.</b> 선택 항목은 <code>new row</code> 3개로 고정되므로 항목 내용은 화면 전달 시 별도로 전달합니다.',
      '<b>한 컬럼에는 단일 종류의 위젯만 배치합니다.</b> 행마다 다르게 배치하면 변환기가 데이터 행을 순차 탐색해 최초 매칭 항목을 해당 컬럼 전체의 타입으로 적용합니다.',
      '<b>합계 행 이름에는 <code>footer</code>를 지정합니다.</b> 누락 시 해당 행에 <code>row</code>가 포함되어 있으면 일반 데이터 행으로 처리되어 데이터에 포함됩니다.',
    ],

    limits: [
      '셀렉트·자동완성·체크콤보의 선택 항목 내용은 지정할 수 없습니다(<code>new row</code> 3개 고정).',
      '컬럼별 편집 가능 여부, 필수 여부, 입력 형식(숫자·날짜 포맷)은 지정할 수 없습니다.',
      '한 컬럼에 두 종류의 위젯을 혼용할 수 없습니다.',
      '11.1의 제약이 동일하게 적용됩니다 — 컬럼 폭 70px·높이 153px 고정.',
    ],

    codeRef: 'ConvertedCodeEditor.tsx',
  },

  {
    chapter: 11, index: 3, id: 'grid-sort',
    name: '그리드 — 정렬·툴팁·사용자필터 (grid-sort)',
    summary: '정렬·툴팁·사용자필터를 작성한 템플릿. 해당 기능이 Figma로 전달되지 않음을 확인하는 항목입니다.',
    capture: 'img/grid-sort.png',
    captureNote: 'Figma 템플릿 1864:8367 · 1540×90',
    figmaNodeId: '1864:8367',

    build: {
      tree: `gs_group_gvwbox
└ gs_gridview_gvw
   ├ header_row        셀 8개 — 7번째 제목이 "툴팁"입니다
   ├ body_row
   │  ├ cell × 5       비어 있습니다      → text 컬럼
   │  ├ cell
   │  │  └ ico_check   → 체크박스 컬럼
   │  ├ cell
   │  │  └ ico_radio   → 라디오 컬럼
   │  └ cell
   │     └ label       "사용자필터1" — 그냥 글자입니다(필터 기능이 아닙니다)
   └ body_row          (2번째 행, 동일)`,
      points: [
        {
          t: '<b>본 항목의 요점은 미지원 사실</b>',
          d: '템플릿 명칭은 정렬·툴팁·사용자필터이지만 <b>결과 XML에는 해당 기능을 활성화하는 속성이 포함되지 않습니다.</b> ' +
             '컬럼 정렬 가능 여부, 제목 툴팁, 사용자 정의 필터는 <b>Figma로 전달할 수 없습니다.</b>',
        },
        {
          t: '「툴팁」·「사용자필터1」은 텍스트로만 처리',
          d: '7번째 컬럼 제목이 <code>툴팁</code>이고 8번째 컬럼 데이터가 <code>사용자필터1</code>이지만 모두 <b>일반 텍스트</b>로 출력됩니다. ' +
             '제목에 아이콘이 적용되거나 필터 UI가 생성되지 않습니다.',
        },
        {
          t: '체크박스·라디오 컬럼은 정상 판정',
          d: '6·7번째 셀의 <code>ico_check</code>·<code>ico_radio</code>는 11.2 규칙에 따라 컬럼 타입으로 적용됩니다. ' +
             '<b>본 그리드에서 전달되는 항목은 컬럼 8개·타입·데이터입니다.</b>',
        },
        {
          t: '빈 셀은 빈 데이터로 출력',
          d: '앞의 5개 셀은 텍스트가 없어 데이터가 빈 문자열로 출력됩니다. <b>컬럼은 8개로 유지</b>되며, 셀이 비어 있어도 컬럼 수는 헤더가 결정합니다(11.1).',
        },
      ],
    },

    xmlOut: {
      note: '11.1과 구조가 동일하므로 컬럼 부분만 축약해 표기했습니다. <b>정렬·툴팁·필터 관련 속성이 없다는 점</b>이 본 항목의 확인 대상입니다.',
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
        '정렬(<code>sortable</code>)·툴팁·필터에 해당하는 속성이 <b>출력되지 않습니다.</b> 해당 기능은 화면 구성 후 개발 단계에서 적용합니다.',
        '「툴팁」은 컬럼 제목 문자열(<code>value="툴팁"</code>)로만 출력되었습니다.',
        '「사용자필터1」은 8번째 컬럼의 일반 텍스트 데이터로 출력됩니다.',
      ],
    },

    pitfalls: [
      '<b>정렬·필터가 필요한 경우 화면 전달 시 별도로 전달합니다.</b> 헤더에 화살표·필터 아이콘을 작성해도 기능은 활성화되지 않으며, 개발 단계에서 적용합니다.',
      '<b>컬럼 제목에는 기능 명칭을 사용하지 않습니다.</b> 제목 <code>툴팁</code>은 기능이 아니라 텍스트이지만, 인수자가 해당 기능이 적용된 컬럼으로 오인할 수 있습니다.',
      '<b>일반 텍스트 컬럼의 제목에는 <code>select</code>·<code>checkbox</code> 등 영문 위젯 이름을 사용하지 않습니다.</b> 지정 시 의도와 무관하게 해당 컬럼이 위젯 컬럼으로 변환됩니다(11.2).',
    ],

    limits: [
      '컬럼 정렬 가능 여부는 지정할 수 없습니다.',
      '컬럼 제목 툴팁은 지정할 수 없습니다.',
      '사용자 정의 필터 UI는 지정할 수 없습니다.',
      '11.1의 제약이 동일하게 적용됩니다.',
    ],

    codeRef: 'ConvertedCodeEditor.tsx',
  },

  {
    chapter: 11, index: 4, id: 'grid-drilldown',
    name: '그리드 드릴다운 (grid-drilldown)',
    summary: '하나의 컬럼에서 상위·하위 관계를 펼치고 접는 그리드. 계층을 그룹 중첩이 아니라 텍스트 들여쓰기 값으로 판정합니다.',
    capture: 'img/grid-drilldown.png',
    captureNote: 'Figma 템플릿 1864:8415 · 1540×120',
    figmaNodeId: '1864:8415',

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
   │  │  └ label                 "depth1" · 들여쓰기 0   → 1단계
   │  └ cell
   │     └ input
   ├ body_row                    2단계 행 — 위와 같은 구조
   │  └ cell
   │     ├ ico_drilldown_docu
   │     └ label                 "depth2" · 들여쓰기 +16 → 2단계
   └ body_row                    3단계 행
      └ cell
         ├ ico_drilldown_docu
         └ label                 "depth2" · 들여쓰기 +32 → 3단계`,
      points: [
        {
          t: '계층 컬럼은 <code>ico_drilldown</code>으로 지정',
          d: '데이터 셀 내부 아이콘 이름에 <code>ico_drilldown</code>이 포함되면 해당 컬럼이 계층 컬럼으로 처리됩니다. ' +
             '<code>ico_drilldown_minus</code>(펼침)·<code>ico_drilldown_docu</code>(말단)와 같이 접미가 추가되어도 무관합니다.',
        },
        {
          t: '<b>계층은 중첩이 아니라 들여쓰기로 표현</b>',
          d: '트리(12장)는 레이어 중첩으로 계층을 구성하지만 <b>그리드 드릴다운은 반대 방식입니다.</b> ' +
             '행은 모두 동일 레벨에 배치하고, <b>계층 컬럼 내 텍스트의 들여쓰기 값</b>으로 단계가 결정됩니다. ' +
             '행을 다른 행 하위에 중첩하면 해당 행은 데이터 행으로도 인식되지 않습니다.',
        },
        {
          t: '단계당 16px씩 일정하게 적용',
          d: '변환기는 들여쓰기 값이 가장 작은 행을 1단계로 지정하고, <b>들여쓰기 값 차이 중 4px를 초과하는 첫 값</b>을 한 단계 폭으로 적용합니다(해당 값이 없으면 16px). ' +
             '본 템플릿은 <b>0 · 16 · 32</b>로 작성해 1·2·3단계가 적용되었습니다. <b>단계 차이는 5px 이상으로 일정하게</b> 지정합니다. ' +
             '2px 단위로 지정하면 4px 이하이므로 동일 단계로 처리됩니다.',
        },
        {
          t: '기준점 지정은 불필요',
          d: '단계는 <b>행 간 차이</b>로만 계산됩니다. 계층 컬럼 전체를 우측으로 이동해도 결과는 동일하며 <b>상대 간격만 일치하면 됩니다.</b>',
        },
        {
          t: '표시 단계는 3단까지',
          d: '결과에 <code>showDepth="3"</code>이 고정 적용됩니다. 4단계 이상을 작성해도 <b>표시는 3단까지</b>로 제한됩니다.',
        },
      ],
    },

    xmlOut: {
      note: '계층 정보는 <code>__depth__</code>라는 <b>비표시 컬럼</b>으로 출력됩니다. 데이터 목록도 함께 표기했습니다.',
      code: `<w2:gridView … class="gvw" dataList="data:gridData_1864_8415">
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
<w2:dataList id="gridData_1864_8415" …>
  <w2:columnInfo>
    <w2:column id="col0" name="col0" dataType="text"></w2:column>
    <w2:column id="col1" name="col1" dataType="text"></w2:column>
    <w2:column id="col2" name="col2" dataType="text"></w2:column>
    <w2:column id="__depth__" name="__depth__" dataType="text"></w2:column>
  </w2:columnInfo>
  <w2:data use="true">
    <w2:row><col0><![CDATA[]]></col0><col1><![CDATA[1단계]]></col1><col2><![CDATA[]]></col2><__depth__><![CDATA[001]]></__depth__></w2:row>
    <w2:row>…<__depth__><![CDATA[002]]></__depth__></w2:row>
    <w2:row>…<__depth__><![CDATA[003]]></__depth__></w2:row>
  </w2:data>
</w2:dataList>`,
      points: [
        '<b><code>__depth__</code> 컬럼이 자동으로 추가됩니다.</b> 작성 대상이 아니며 화면에도 표시되지 않지만, 각 행의 단계를 <code>001</code>·<code>002</code>·<code>003</code>으로 저장합니다.',
        '들여쓰기 값이 세 자리 숫자로 변환된 것이 <b>계층 정보의 전부</b>이며, 결과에서 계층은 이 값으로 확인합니다.',
        '버튼 컬럼의 셀 텍스트는 데이터가 아니라 컬럼의 <code>value</code>로 출력되므로 <code>col2</code> 데이터는 비어 있습니다(11.2).',
      ],
    },

    pitfalls: [
      '<b>행을 중첩해 계층을 구성하지 않습니다.</b> 중첩된 행은 데이터 행으로 인식되지 않아 <b>결과에서 제외됩니다.</b> 계층은 동일 레벨 행의 들여쓰기로만 표현합니다.',
      '<b>들여쓰기는 16px 배수로 일정하게 지정합니다.</b> 값이 불규칙하면 4px 이하 차이는 동일 단계로 처리되고, 5px를 초과하는 불규칙한 값은 해당 값이 단계 폭으로 채택되어 이후 단계가 모두 어긋납니다.',
      '<b>계층 컬럼에는 모든 행에 텍스트를 배치합니다.</b> 텍스트가 없으면 들여쓰기를 측정할 수 없어 셀 좌측 끝(1단계)으로 처리됩니다.',
      '펼침/접힘 아이콘(<code>ico_drilldown_minus</code> 등)의 <b>종류로는 단계를 표현할 수 없습니다.</b> 아이콘은 해당 컬럼이 계층 컬럼임을 지정할 뿐이며, 단계는 들여쓰기가 결정합니다.',
      '<b>계층은 3단까지 작성합니다.</b> 4단계 이상은 작성해도 표시되지 않습니다.',
    ],

    limits: [
      '표시 단계 수(3단)는 변경할 수 없습니다.',
      '행의 펼침·접힘 상태는 지정할 수 없습니다.',
      '단계별 아이콘은 지정할 수 없으며 아이콘은 프레임워크가 생성합니다.',
      '11.1의 제약이 동일하게 적용됩니다.',
    ],

    codeRef: 'ConvertedCodeEditor.tsx',
  },

  {
    chapter: 11, index: 5, id: 'grid-noresult',
    name: '데이터없음 그리드 + 페이지 목록 (grid-noresult)',
    summary: '조회 결과가 없는 경우의 빈 그리드와 하단 페이지 목록. 이름의 조각 하나로 데이터 제외를 지정합니다.',
    capture: ['img/grid-noresult.png', 'img/grid-pagelist.png'],
    captureNote: 'Figma 템플릿 1864:8464(그리드) · 1864:8216(페이지 목록)',
    figmaNodeId: '1864:8464',

    build: {
      tree: `nr_group_gvwbox
└ nr_gridview_gvw    ★ 이름이 "nr_"로 시작 → 데이터없음 그리드
   ├ header_row      셀 10개 → 컬럼 10개 (헤더는 그대로 나갑니다)
   └ body_row × N    데이터 행은 그리지 않아도 됩니다

page_group_pglbox
└ page_pagelist_pgl
   └ pgn_group × N   ← 화살표·숫자를 몇 개 그려도 안 나갑니다`,
      points: [
        {
          t: '이름의 조각 하나로 빈 그리드를 지정',
          d: '그리드 레이어 이름이 <b><code>nr_</code>로 시작</b>하거나 이름에 <code>noresult</code>·<code>no_result</code>가 포함되면 데이터없음 그리드로 처리됩니다. ' +
             '본 템플릿은 <code>nr_gridview_gvw</code>로 <code>nr_</code> 방식을 사용했습니다.',
        },
        {
          t: '<b>데이터 행 작성 불필요</b>',
          d: '데이터없음으로 판정되면 <b>데이터 행이 출력되지 않으며</b> 「데이터가 없음」 메시지가 표시되도록 설정이 적용됩니다. ' +
             '컬럼(헤더)은 그대로 출력되므로 <b>헤더 행은 정확히 작성하고 데이터 행은 작성하지 않습니다.</b>',
        },
        {
          t: '하위 레이어 이름으로도 적용',
          d: '그리드 자체가 아니라 <b>내부 레이어 이름에</b> <code>noresult</code>·<code>no_result</code>가 포함되어도 해당 그리드 전체가 빈 그리드로 처리됩니다. ' +
             '단 <code>nr_</code>은 <b>그리드 자체의 이름에서만</b> 인식됩니다.',
        },
        {
          t: '페이지 목록은 컨테이너와 이름만 필요',
          d: '<code>pglbox</code> 그룹 내부에 두 번째 조각이 <code>pagelist</code>인 레이어를 배치하면 됩니다. ' +
             '<b>내부에 작성한 화살표·페이지 번호는 출력되지 않으며</b> 변환기가 하위 항목을 탐색하지 않습니다.',
        },
        {
          t: '페이지 개수는 작성 내용과 무관',
          d: '결과에 전체 100건을 기준으로 페이지를 계산하는 초기화가 자동 적용됩니다. ' +
             '<b>Figma에 작성한 페이지 버튼 개수는 결과에 반영되지 않습니다.</b>',
        },
      ],
    },

    xmlOut: {
      note: '데이터없음 그리드는 <b>데이터 목록이 빈 상태로</b> 출력되며, 화면 실행 시 초기화 처리가 함께 적용됩니다. 페이지 목록은 한 줄로 출력됩니다.',
      code: `<xf:group class="gvwbox">
  <w2:gridView style="height:153px;" autoFit="allColumn" class="gvw"
               dataList="data:gridData_1864_8464" noResultMessage="데이터가 없음">
    <w2:header> … 컬럼 10개(그린 그대로) … </w2:header>
    <w2:gBody>  … 컬럼 표시 설정 10개 … </w2:gBody>
  </w2:gridView>
</xf:group>

<w2:dataList id="gridData_1864_8464" …>
  <w2:columnInfo> … </w2:columnInfo>
  <w2:data use="true"></w2:data>          ← 데이터 행이 하나도 없습니다
</w2:dataList>

<!-- 페이지 목록 -->
<xf:group class="pglbox">
  <w2:pageList displayButtonType="display" adaptive="none" class="pgl" id="pageList_…"></w2:pageList>
</xf:group>`,
      points: [
        '<code>noResultMessage="데이터가 없음"</code>이 자동 적용되며 문구는 디자이너 지정 대상이 아닙니다.',
        '데이터 목록의 <code>&lt;w2:data&gt;</code>가 비어 있으며, Figma에 작성한 행이 출력되지 않은 결과입니다.',
        '<code>&lt;w2:pageList&gt;</code>는 <b>하위 항목 없이 한 줄</b>로 출력되며, 작성한 화살표·번호가 제외된 결과입니다.',
        '페이지 목록의 <code>id</code>도 노드 번호를 기준으로 자동 부여됩니다.',
      ],
    },

    pitfalls: [
      '<b>일반 그리드에서는 하위 레이어 이름에 <code>noresult</code>가 포함되지 않도록 합니다.</b> 포함 시 데이터가 결과에서 제외되므로, 데이터가 표시되지 않으면 하위 레이어 이름을 우선 확인합니다.',
      '<b><code>nr_</code>은 그리드로 매핑되는 레이어 이름에 지정합니다.</b> 외부 그룹(<code>nr_group_gvwbox</code>)에만 지정하면 적용되지 않습니다.',
      '<b>데이터없음 그리드는 헤더만 정확히 작성합니다.</b> 데이터 행은 결과에 출력되지 않습니다.',
      '<b>페이지 목록은 외형만 작성합니다.</b> 화살표 종류와 현재 페이지 위치는 전달되지 않습니다.',
      '페이지 목록을 <code>pglbox</code> 없이 단독 배치하면 위치·여백을 지정하는 CSS가 적용되지 않습니다.',
    ],

    limits: [
      '「데이터가 없음」 문구는 변경할 수 없습니다.',
      '페이지 목록의 버튼 개수·화살표 종류·현재 페이지는 지정할 수 없습니다.',
      '페이지 크기도 지정할 수 없으며 프레임워크 기본값이 적용됩니다.',
      '11.1의 제약이 동일하게 적용됩니다.',
    ],

    codeRef: 'ConvertedCodeEditor.tsx',
  },

  {
    chapter: 12, index: 1, id: 'tree',
    name: '트리 (tree)',
    summary: '상위·하위 관계를 펼치고 접는 목록. 계층을 그리드 드릴다운과 반대 방식인 레이어 중첩으로 표현합니다.',
    capture: 'img/tree.png',
    captureNote: 'Figma 템플릿 1864:8516 · 1540×324',
    figmaNodeId: '1864:8516',

    build: {
      tree: `tree1_group_tvwbox
└ tree1_treeview_tvw       높이 300   ← 이 높이가 결과에 실립니다
   ├ n_node                2번째 조각이 "node" → 노드 하나
   │  └ nrow
   │     ├ ico_TreeDocu    아이콘은 프레임워크가 그립니다
   │     └ nlabel          "New" ← 노드 라벨이 됩니다
   ├ n_node                2번째 노드
   │  ├ nrow
   │  │  ├ ico_TreeMinus
   │  │  └ nlabel          "New"
   │  └ n_node             ★ 노드 안에 노드 → 그대로 하위 계층이 됩니다
   │     └ nrow
   │        ├ ico_TreeDocu
   │        └ nlabel       "New"
   └ n_node                3번째 노드 — 3단계까지 중첩한 예
      ├ nrow
      │  ├ ico_TreeMinus
      │  └ nlabel          "New"
      └ n_node             2단계
         ├ nrow
         │  ├ ico_TreeMinus
         │  └ nlabel       "New"
         └ n_node          3단계
            └ nrow
               ├ ico_TreeDocu
               └ nlabel    "New"`,
      points: [
        {
          t: '노드는 두 번째 조각이 <code>node</code>와 <b>완전 일치</b>해야 함',
          d: '<code>n_node</code>와 같이 두 번째 조각이 <code>node</code>인 프레임만 트리 노드로 처리됩니다. ' +
             '<b>부분일치가 아닌 완전일치</b>이므로 <code>n_nodes</code>·<code>n_treenode</code>는 노드로 인식되지 않습니다. ' +
             '접두어(<code>n</code>)에는 제약이 없습니다.',
        },
        {
          t: '<b>계층은 중첩으로 구성 — 드릴다운과 반대</b>',
          d: '노드 프레임을 다른 노드 프레임 <b>하위에</b> 배치하면 하위 계층으로 처리됩니다. ' +
             '11.4 그리드 드릴다운은 행을 동일 레벨에 배치하고 <b>들여쓰기 픽셀</b>로 계층을 구성하지만, 트리는 <b>중첩만 참조하며 들여쓰기는 참조하지 않습니다.</b>',
        },
        {
          t: '라벨은 노드 내 텍스트를 <b>연결한 값</b>',
          d: '노드 내부의 텍스트를 순서대로 연결해 하나의 라벨로 생성합니다(<b>하위 노드의 텍스트는 제외</b>). ' +
             '따라서 한 줄을 텍스트 두 개로 분리해 작성하면 <b>하나의 라벨로 연결</b>됩니다.',
        },
        {
          t: '아이콘은 프레임워크가 생성',
          d: '폴더/문서 구분과 펼침 표시는 트리 컴포넌트가 자체 생성합니다. 결과에는 아이콘 영역이 <b>빈 값으로</b> 출력되므로 ' +
             '<b>노드별 아이콘을 지정할 수 없습니다.</b> 작성한 <code>ico_Tree*</code> 레이어는 Figma에서 형태를 확인하는 용도입니다.',
        },
        {
          t: '<b>트리 높이는 측정값이 출력됨</b>',
          d: '트리 레이어의 Figma 높이가 <code>style="height:300px"</code>로 출력됩니다. 클래스가 적용된 경우에도 예외적으로 출력되는 값이며, ' +
             '5장의 <b>네 가지 출력 대상 중 하나</b>입니다. 트리의 표시 높이는 <b>Figma에서 지정합니다.</b>',
        },
      ],
    },

    xmlOut: {
      note: '노드마다 빈 태그가 9개씩 출력되어 분량이 많으므로 첫 노드만 표기하고 나머지는 축약했습니다.',
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
        '<b>라벨만 값이 채워지고 나머지 9개 태그는 빈 상태로</b> 출력됩니다. 아이콘·값·폴더 여부를 작성해도 전달되지 않습니다.',
        'Figma의 노드 중첩이 <code>&lt;w2:node&gt;</code> 중첩으로 이관되었으며, 들여쓰기 값은 출력되지 않습니다.',
        '<code>style="height:300px"</code>가 출력되며, 트리 레이어의 측정 높이입니다.',
        '<code>dataType="listed"</code>·<code>tooltipGroupClass="false"</code>는 변환기가 적용하는 기본값이며 디자이너 지정 대상이 아닙니다.',
      ],
    },

    pitfalls: [
      '<b>노드 이름의 두 번째 조각을 <code>node</code> 외의 값으로 지정하면</b> 해당 프레임은 노드로 인식되지 않아 <b>하위 노드와 함께 결과에서 제외됩니다.</b> 완전일치가 적용됩니다.',
      '<b>트리 계층은 레이어 중첩으로 표현합니다</b>(11.4 그리드 드릴다운과 반대). 동일 레벨에 배치하고 x 좌표만 이동하면 전체가 1단계로 처리됩니다.',
      '<b>체크박스가 불필요한 경우 노드 내부 레이어 이름에 <code>check</code>를 사용하지 않습니다.</b> 하나라도 포함되면 트리 전체에 체크박스가 활성화됩니다.',
      '<b>노드 한 줄은 텍스트 레이어 하나로 작성합니다.</b> 두 개로 분리하면 라벨이 연결되어 출력됩니다(예: 「New」 + 「(3)」 → 「New(3)」).',
    ],

    limits: [
      '노드별 아이콘은 지정할 수 없으며 전체가 빈 값으로 출력됩니다.',
      '노드의 펼침 상태와 선택 상태는 지정할 수 없습니다.',
      '노드별 체크박스 제어는 불가능하며 트리 전체 단위(<code>showCheckbox</code>)로만 적용됩니다.',
      '노드에 연결된 값(코드값 등)은 지정할 수 없습니다.',
    ],

    metrics: [
      { 대상: 'tvwbox',  배경: '흰색', 보더: '1px',   radius: '6', 기타: 'padding 12 16 · margin-bottom 16 · 세로 스크롤' },
      { 대상: '트리',    배경: '—',    보더: '없음',   radius: '—', 기타: '높이 = Figma 실측(여기선 300)' },
      { 대상: '노드 한 줄', 배경: '—',  보더: '—',     radius: '—', 기타: '높이 24 · 아이콘 16×16(프레임워크가 그림)' },
    ],

    codeRef: 'ConvertedCodeEditor.tsx',
  },

  {
    chapter: 12, index: 2, id: 'tree-virtual',
    name: '트리 — virtual (tree-virtual)',
    summary: '구조는 12.1과 동일하며 클래스 토큰 하나만 다릅니다. 항목명의 virtual에 해당하는 기능은 결과에 출력되지 않습니다.',
    capture: 'img/tree-virtual.png',
    captureNote: 'Figma 템플릿 1864:8559 · 1540×324',
    figmaNodeId: '1864:8559',

    build: {
      tree: `tree2_group_tvwbox        (12.1과 동일)
└ tree2_treeview_mn_tvw   ← 다른 곳은 여기, 클래스 토큰 하나뿐입니다
   ├ n_node               12.1의 노드와 글자 하나 다르지 않습니다
   ├ n_node               (2단계·3단계 중첩까지 동일)
   └ n_node`,
      points: [
        {
          t: '<code>tvw</code>를 <code>mn_tvw</code>로 변경',
          d: '노드 구조·중첩·라벨 규칙은 12.1과 <b>동일합니다.</b> 트리 레이어 이름의 클래스 자리만 <code>mn_tvw</code>로 지정합니다. ' +
             '7장의 <code>tit_main</code>/<code>tit_sub</code>, 9장의 <code>tbc</code>/<code>tbc_sub</code>와 동일한 방식입니다.',
        },
        {
          t: '<b>virtual 기능은 결과에 출력되지 않음</b>',
          d: '항목명은 virtual(대용량 목록 처리 방식)이지만 <b>결과 XML에는 해당 기능을 활성화하는 속성이 포함되지 않습니다.</b> ' +
             '전달되는 값은 <code>class="mn_tvw"</code>뿐이며, 11.3의 정렬·툴팁·필터와 동일한 경우입니다.',
        },
        {
          t: '형태는 클래스에 연결된 CSS가 결정',
          d: '<code>mn_tvw</code>의 적용 형태는 CSS가 결정합니다. 단 <b>템플릿 CSS(<code>base.css</code>)에는 해당 클래스 규칙이 정의되어 있지 않으며</b> ' +
             '프로젝트에서 별도로 정의하는 항목입니다. 따라서 <b>템플릿 CSS만 적용한 경우 12.1과 표시 형태에 차이가 없습니다.</b>',
        },
        {
          t: '높이는 측정값이 출력됨',
          d: '12.1과 동일하게 트리 레이어의 Figma 높이가 출력됩니다. 두 항목의 템플릿 높이가 동일하므로(300) 결과도 같습니다.',
        },
      ],
    },

    xmlOut: {
      note: '12.1의 결과와 <code>class</code>만 다릅니다.',
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
        '<code>class="tvw"</code>가 <code>class="mn_tvw"</code>로 변경된 것 외에는 12.1과 구조가 동일합니다.',
        '<b>virtual·대용량·스크롤에 해당하는 속성이 출력되지 않습니다.</b> 결과에서 두 항목은 클래스로만 구분됩니다.',
      ],
    },

    pitfalls: [
      '<b>클래스를 <code>mn_tvw</code>가 아닌 <code>mn</code>·<code>virtual</code>로 지정하면</b> 의도한 클래스가 적용되지 않습니다. 토큰 전체를 지정해야 합니다.',
      '<b>대용량 목록 처리가 필요한 경우 화면 전달 시 별도로 전달합니다.</b> 클래스 이름만으로는 virtual 동작이 전달되지 않습니다.',
      '12.1의 주의사항이 동일하게 적용됩니다 — 노드 이름 완전일치, 중첩 기반 계층, <code>check</code> 포함 이름에 의한 체크박스 활성화.',
    ],

    limits: [
      'virtual(대용량 목록) 동작은 표현할 수 없습니다.',
      '<code>mn_tvw</code>의 형태는 프로젝트 CSS에 따라 결정되며, 템플릿 CSS만 적용한 경우 12.1과 차이가 없습니다.',
      '12.1의 제약이 동일하게 적용됩니다 — 노드별 아이콘·펼침 상태·노드별 체크 미반영.',
    ],

    codeRef: 'ConvertedCodeEditor.tsx',
  },

  {
    chapter: 13, index: 1, id: 'button',
    name: '버튼 (button)',
    summary: '클릭 동작을 수행하는 버튼. 형태·아이콘·색상을 모두 클래스가 결정합니다.',
    capture: ['img/button-1.png', 'img/button-2.png', 'img/button-3.png', 'img/button-4.png'],
    captureNote: '위에서부터 기본 / 기본·비활성 / 아이콘 전용 / 아이콘 전용·비활성 · Figma 템플릿 1864:8618 · 8710 · 8802 · 8855',
    figmaNodeId: '1864:8618',

    build: {
      tree: `def_group_titbox            (버튼을 담아 두기만 하는 상자)
├ lt_group_lt
│  └ sub_textbox_tit_sub    "기본" — 상태 이름 라벨
└ rt_group_rt
   ├ b_button_btn_cm
   │  ├ bicon               (장식 — 매핑 안 됨)
   │  └ lbl_textbox         "기본버튼" ← 라벨이 됩니다
   ├ b_button_btn_cm fill   (이하 변형 토큰만 다른 같은 구조)
   └ b_button_btn_cm search`,
      points: [
        {
          t: '조립 순서는 <code>btn_cm</code> → 변형 → <code>icon</code> → <code>disabled</code>',
          d: '버튼 클래스는 <code>btn_cm</code>으로 시작합니다. 이후 <b>변형</b>(<code>pt</code>·<code>fill</code>·<code>copy</code>·<code>save</code> 등)을 지정하고, ' +
             '아이콘 전용 버튼은 <code>icon</code>을, 비활성은 <code>disabled</code>를 마지막에 지정합니다(예: <code>btn_cm save icon disabled</code>, 3장 참조).',
        },
        {
          t: '<b>적용 아이콘은 클래스가 결정</b>',
          d: '<code>btn_cm search</code>는 검색 아이콘, <code>btn_cm save</code>는 저장 아이콘이 적용됩니다. <b>결과에 출력되는 것은 클래스이며</b> 작성한 아이콘 레이어는 출력되지 않습니다. ' +
             '<b>단 Figma 작성이 불필요한 것은 아닙니다.</b> 인수자가 확인하는 대상이 해당 화면이므로 아이콘도 작성합니다. 세부 구분은 <b>부록 21.5</b>를 참조합니다.',
        },
        {
          t: '아이콘 전용 버튼에는 텍스트를 배치하지 않음',
          d: '<code>icon</code> 토큰을 지정하고 <b>내부에 텍스트 레이어를 배치하지 않으면</b> 아이콘만 있는 정사각형 버튼(24×24)으로 출력됩니다. ' +
             '<code>icon</code>이 없으면 <code>bicon</code>을 작성해도 <b>텍스트만</b> 출력됩니다(7장 업무버튼 참조).',
        },
        {
          t: '강조 버튼은 <code>fill</code> 토큰으로 지정',
          d: '색상·크기·테두리는 클래스에 연결된 CSS가 결정합니다. <b>채움 형태의 버튼이 필요한 경우 색상을 지정하는 대신 <code>fill</code> 토큰을 지정합니다</b> ' +
             '(예: <code>btn_cm fill</code>). 동일 버튼을 여러 화면에서 사용할 때 색상이 일괄 적용되는 것이 이 방식의 이점입니다.',
        },
        {
          t: '비활성은 이름에 <code>disabled</code>를 지정',
          d: '이름의 조각에 <code>disabled</code>(또는 <code>dis</code>)가 포함되면 결과에 <code>disabled="true"</code>가 출력됩니다. ' +
             '이때 <b><code>disabled</code>는 클래스에서 제외됩니다.</b> 상태는 클래스가 아니라 속성으로 전달되기 때문입니다. 색상 지정만으로는 비활성이 적용되지 않습니다.',
        },
      ],
    },

    xmlOut: {
      note: '변형이 19종이므로 대표 항목만 표기했습니다. 네 가지 상태를 비교해 차이를 확인할 수 있습니다.',
      code: `<!-- 기본 -->
<w2:button class="btn_cm">
  <w2:textbox tagname="span" label="기본버튼"></w2:textbox>
</w2:button>
<w2:button class="btn_cm fill">
  <w2:textbox tagname="span" label="기본버튼"></w2:textbox>
</w2:button>

<!-- 기본 · 비활성 -->
<w2:button class="btn_cm" disabled="true">
  <w2:textbox tagname="span" label="기본버튼"></w2:textbox>
</w2:button>

<!-- 아이콘 전용 -->
<w2:button class="btn_cm copy icon">
  <w2:textbox tagname="span" label=""></w2:textbox>
</w2:button>

<!-- 아이콘 전용 · 비활성 -->
<w2:button class="btn_cm copy icon" disabled="true">
  <w2:textbox tagname="span" label=""></w2:textbox>
</w2:button>`,
      points: [
        '<b><code>style</code>이 출력되지 않습니다.</b> 버튼의 형태는 <code>class</code>가 결정합니다.',
        '라벨은 속성이 아니라 <b>하위 <code>&lt;w2:textbox tagname="span"&gt;</code></b>으로 출력됩니다. 아이콘 전용 버튼은 해당 하위 항목이 <code>label=""</code>로 비어 있으며 태그는 유지됩니다.',
        '<b><code>disabled</code>가 클래스에서 제외되고 속성으로 출력되었습니다.</b> 이름에 <code>btn_cm copy icon disabled</code>를 지정했으나 결과 class는 <code>btn_cm copy icon</code>입니다.',
        '<b>버튼이 처리하는 상태는 <code>disabled</code> 하나입니다.</b> <code>req</code>·<code>error</code>·<code>readonly</code>는 클래스에서 <b>제외되기만 하고 속성으로도 출력되지 않습니다.</b> 버튼 이름에 지정하면 결과에 반영되지 않으며, 해당 세 가지는 폼 필드에서 전달됩니다(15.1).',
        '<code>bicon</code>·<code>lbl_textbox</code> 레이어는 결과에 출력되지 않으며 라벨 텍스트만 추출됩니다.',
      ],
    },

    pitfalls: [
      '<b>아이콘 버튼에는 클래스에 변형 토큰을 함께 지정합니다.</b> 적용 아이콘은 클래스가 전달합니다(21.5). Figma에 아이콘을 작성하는 것만으로는 결과 화면에 적용되지 않습니다.',
      '<b>아이콘 전용 버튼의 클래스에는 <code>icon</code> 토큰을 지정합니다.</b> 누락 시 아이콘과 텍스트가 모두 없는 버튼으로 출력됩니다.',
      '비활성 버튼은 색상 지정만으로 적용되지 않으며 이름에 <code>disabled</code>를 지정해야 합니다.',
      '<b>버튼 이름에 <code>req</code>·<code>error</code>·<code>readonly</code>를 지정하지 않습니다.</b> 버튼이 처리하는 상태는 <code>disabled</code>뿐이며, 해당 세 가지는 클래스에서 제외되고 결과에 출력되지 않습니다.',
    ],

    limits: [
      '배경색·글자색·테두리·크기는 클래스가 결정하며, 개별 버튼의 색상을 다르게 지정할 수 없습니다.',
      '변형 목록(<code>pt</code>·<code>fill</code>·<code>copy</code>·<code>save</code> 등)에 없는 아이콘은 사용할 수 없습니다. 전체 목록은 3장의 표를 참조합니다.',
      '마우스 오버·클릭 등의 상태는 이름으로 전달할 수 없으며 비활성만 <code>disabled</code>로 전달됩니다.',
      '버튼에 아이콘과 텍스트를 <b>함께</b> 배치하고 아이콘 위치를 지정하는 것은 표현할 수 없습니다.',
    ],

    metrics: [
      { 대상: '버튼(기본)',   배경: '#FFFFFF',   보더: '#C4CDD5 1px', radius: '4', 기타: '높이 24 · padding 0 8 · gap 4' },
      { 대상: '버튼(fill)',   배경: '#454F5B',   보더: '동일색', radius: '4', 기타: '글자색 반전' },
      { 대상: '아이콘 전용',  배경: '기본과 동일', 보더: '1px',  radius: '4', 기타: '24×24 정사각형 · 아이콘 12×12' },
      { 대상: '비활성',       배경: '#EAEEF1',   보더: '연한색', radius: '4', 기타: 'CSS가 정합니다(Figma 색 무관)' },
    ],

    codeRef: 'ConvertedCodeEditor.tsx · figma-style.ts',
  },

  {
    chapter: 13, index: 2, id: 'trigger',
    name: '트리거 (trigger)',
    summary: '버튼과 형태·구조가 동일하나 Figma에서 지정한 배경색이 결과에 출력되는 컴포넌트. 이름의 조각 하나로 구분됩니다.',
    capture: ['img/trigger-1.png', 'img/trigger-2.png', 'img/trigger-3.png', 'img/trigger-4.png'],
    captureNote: '위에서부터 기본 / 기본·비활성 / 아이콘 전용 / 아이콘 전용·비활성 · Figma 템플릿 1864:8913 · 9005 · 9097 · 9150',
    figmaNodeId: '1864:8913',

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
          t: '두 번째 조각을 <code>trigger</code>로 지정',
          d: '<code>b_button_btn_cm</code>을 <code>t_trigger_btn_cm</code>으로 지정합니다. <b>클래스와 구조는 버튼과 동일합니다.</b> ' +
             '변형 조합 순서(<code>btn_cm</code> → 변형 → <code>icon</code> → <code>disabled</code>)와 아이콘을 클래스가 결정하는 방식도 같습니다.',
        },
        {
          t: '<b>트리거는 Figma 채움색이 인라인으로 출력</b>',
          d: 'Figma에서 지정한 채움색이 <code>style="background-color:rgb(255,255,255)"</code>로 결과에 출력됩니다. ' +
             '<b>인라인 스타일은 클래스보다 우선 적용되므로 트리거의 배경색은 CSS가 아니라 Figma에서 지정한 색상이 최종 적용됩니다.</b> ' +
             '버튼은 해당 속성이 출력되지 않아 CSS가 배경을 결정하며(13.1), 이것이 두 컴포넌트의 유일한 차이입니다.',
        },
        {
          t: '상태별 색상을 Figma에서 지정',
          d: '비활성 버튼은 CSS가 색상을 적용하지만 <b>트리거는 인라인 배경색이 CSS보다 우선하므로 비활성 색상도 Figma에서 지정해야 합니다.</b> ' +
             '템플릿에도 비활성 트리거가 회색(<code>rgb(234,238,241)</code>)으로 지정되어 있습니다. <b>활성과 동일한 색상으로 지정하면 결과도 동일한 색상으로 출력됩니다.</b>',
        },
        {
          t: '라벨 출력 위치도 상이',
          d: '버튼은 라벨이 하위 <code>&lt;w2:textbox&gt;</code>로 출력되지만 트리거는 <code>&lt;xf:label&gt;</code>로 출력됩니다. ' +
             '디자이너 작업은 양쪽 모두 <b>내부에 텍스트 레이어를 하나 배치</b>하는 것으로 동일합니다.',
        },
        {
          t: '사용 대상은 디자이너 결정 사항이 아님',
          d: '버튼과 트리거는 <b>화면 동작이 다른 컴포넌트</b>입니다. 사용 대상은 화면 사양에 따라 결정되므로 ' +
             '<b>템플릿에 작성된 형태를 그대로 따릅니다.</b> 표시 형태가 동일해 육안으로는 구분되지 않습니다.',
        },
      ],
    },

    xmlOut: {
      note: '13.1의 버튼 결과와 비교하면 차이는 세 가지입니다 — 태그, 라벨 위치, <code>style</code>.',
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
        '<b><code>style="background-color:…"</code>가 출력됩니다.</b> Figma에서 지정한 색상이 반영된 결과이며 버튼에는 출력되지 않는 속성입니다.',
        '비활성 트리거의 배경색은 <code>rgb(234,238,241)</code>이며, CSS 값이 아니라 <b>Figma에서 지정한 색상</b>입니다.',
        '라벨이 <code>&lt;xf:label&gt;</code>로 출력됩니다(버튼은 <code>&lt;w2:textbox tagname="span"&gt;</code>). 텍스트가 없으면 해당 태그 없이 <b>즉시 종료됩니다.</b>',
        '<code>type="button"</code>은 변환기가 적용하는 기본값입니다.',
        '<code>disabled</code>는 버튼과 동일하게 클래스에서 제외되고 속성으로 출력됩니다.',
      ],
    },

    pitfalls: [
      '<b>비활성 트리거는 Figma에서도 비활성 색상으로 지정합니다.</b> 트리거는 지정한 배경색이 인라인으로 출력되어 CSS보다 우선하므로, 이름에 <code>disabled</code>를 지정해도 활성 색상으로 작성하면 해당 색상이 출력됩니다.',
      '<b>트리거에는 채움색을 지정합니다.</b> 미지정 시 배경 속성이 출력되지 않아 CSS 값이 적용됩니다.',
      '<b>버튼과 트리거는 용도에 따라 구분해 사용합니다.</b> 표시 형태가 동일해 캡처로는 구분되지 않으나 결과 태그가 다릅니다.',
      '13.1의 주의사항이 동일하게 적용됩니다 — 아이콘은 클래스가 결정, <code>icon</code> 토큰 누락, 색상 지정만으로는 비활성 미적용.',
    ],

    limits: [
      '글자색·테두리·크기는 버튼과 동일하게 클래스가 결정하며 <b>배경색만</b> 인라인으로 출력됩니다.',
      '마우스 오버·클릭 상태의 배경색은 전달할 수 없으며 기본 상태의 채움색만 출력됩니다.',
      '변형 목록에 없는 아이콘은 사용할 수 없습니다(13.1과 동일).',
    ],

    metrics: [
      { 대상: '트리거(기본)', 배경: 'Figma 채움색이 실립니다', 보더: '클래스', radius: '4', 기타: '높이 24 — 템플릿은 흰색' },
      { 대상: '트리거(비활성)', 배경: 'Figma 채움색이 실립니다', 보더: '클래스', radius: '4', 기타: '템플릿은 #EAEEF1로 칠해 둠' },
      { 대상: '그 외',        배경: '—',                    보더: '클래스', radius: '—', 기타: '버튼과 동일(13.1 표 참조)' },
    ],

    codeRef: 'ConvertedCodeEditor.tsx · figma-style.ts',
  },

  {
    chapter: 14, index: 1, id: 'accordion',
    name: '아코디언 (accordion)',
    summary: '제목을 선택해 본문을 펼치고 접는 목록. 본문은 텍스트 한 줄만 전달됩니다.',
    capture: 'img/accordion.png',
    captureNote: 'Figma 템플릿 1864:9208 · 1540×134',
    figmaNodeId: '1864:9208',

    build: {
      tree: `acd_group_acdbox              (아코디언을 감싸는 상자)
└ acd_accordion_acd
   ├ p_panels                  2번째 조각이 "panels" → 패널 하나
   │  ├ pt_paneltitle          2번째 조각이 "paneltitle" → 제목
   │  │  ├ ptx_textbox         "Accordion 1" ← 제목이 됩니다
   │  │  └ pnavi
   │  │     └ ico_accordion_up (장식 — 매핑 안 됨, 화살표는 프레임워크가 그립니다)
   │  └ pc_panelcontent        2번째 조각이 "panelcontent" → 본문
   │     └ ctx_textbox         "내용" ← 본문이 됩니다(한 줄만)
   ├ p_panels                  2번째 패널 — 접힌 상태로 그려 본문 없음
   │  └ pt_paneltitle
   │     ├ ptx_textbox         "Accordion 2"
   │     └ pnavi
   │        └ ico_accordion_down
   └ p_panels                  3번째 패널 (2번째와 동일)`,
      points: [
        {
          t: '패널 하나는 두 번째 조각이 <code>panels</code>인 프레임',
          d: '<code>p_panels</code>와 같이 두 번째 조각이 <b><code>panels</code>와 완전히 일치</b>하는 직속 하위 항목만 패널로 계산됩니다. ' +
             '해당 개수가 결과의 패널 개수입니다. <code>panel</code>(단수)이나 <code>p_panel1</code>은 패널로 인식되지 않습니다.',
        },
        {
          t: '제목과 본문도 두 번째 조각으로 판정',
          d: '패널 내부에서 <code>paneltitle</code>이 제목, <code>panelcontent</code>가 본문입니다. ' +
             '두 항목 모두 <b>패널의 직속 하위 항목</b>이어야 하며, 내부에서 <b>처음 확인되는 텍스트</b>가 값으로 적용됩니다.',
        },
        {
          t: '<b>본문은 텍스트 한 줄만 전달</b>',
          d: '<code>panelcontent</code> 내부에서 <b>첫 번째 텍스트</b>만 추출해 한 줄로 출력합니다. ' +
             '표·버튼·이미지·복수 문단을 배치해도 해당 구조는 결과에 반영되지 않습니다. <b>9장 탭과 반대</b>이며, ' +
             '탭 본문은 작성한 구조가 유지되지만 아코디언 본문은 문자열 하나로 축약됩니다.',
        },
        {
          t: '접힌 패널은 본문 없이 작성',
          d: '<code>panelcontent</code>가 없는 패널은 <b>본문이 빈 상태로</b> 출력되며 오류가 아닙니다. ' +
             '템플릿에도 첫 패널만 본문이 작성되어 있고 나머지는 제목만 배치되어 있습니다.',
        },
        {
          t: '화살표는 결과에 출력되지 않으나 Figma에는 작성',
          d: '<code>pnavi</code>·<code>ico_accordion_up</code>·<code>ico_accordion_down</code>은 매핑되지 않아 <b>결과에서 제외되며</b> 실제 화살표는 프레임워크가 생성합니다. ' +
             '단 <b>Figma에는 작성합니다.</b> 템플릿에도 패널마다 배치되어 있으며, 상하 화살표로 <b>펼침 상태인 패널</b>을 인수자에게 전달합니다(21.5).',
        },
      ],
    },

    xmlOut: {
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
        '제목은 <code>&lt;w2:panelTitle&gt;</code>의 <code>label</code> 속성으로, 본문은 <code>&lt;w2:panelContent&gt;</code> 내 <b><code>&lt;w2:textbox&gt;</code> 한 줄</b>로 출력됩니다.',
        '본문을 작성하지 않은 패널은 <code>&lt;w2:panelContent&gt;</code>가 빈 상태로 출력됩니다.',
        '<code>pnavi</code>·아이콘 레이어는 결과에 출력되지 않습니다.',
        '펼침 상태를 지정하는 속성이 출력되지 않으며 초기 상태는 프레임워크가 결정합니다.',
      ],
    },

    pitfalls: [
      '<b>패널 본문은 텍스트 한 줄로 작성합니다.</b> 표·버튼·복수 문단을 작성해도 첫 텍스트 한 줄만 출력되므로, 본문이 복잡한 화면에는 아코디언이 아니라 탭(9장)을 사용합니다.',
      '<b>패널 프레임 이름의 두 번째 조각은 <code>panels</code>로 지정합니다</b>(완전일치). 다른 값으로 지정하면 패널로 인식되지 않아 제목·본문이 함께 제외됩니다.',
      '<code>paneltitle</code>·<code>panelcontent</code>를 <b>패널의 직속 하위가 아닌 위치에 배치하면</b> 인식되지 않습니다.',
      '<b>제목 프레임에는 텍스트를 하나만 배치합니다.</b> 복수 배치 시 첫 번째만 제목으로 적용되며, 부제·개수 배지 등은 결과에서 제외됩니다.',
      '패널의 펼침 상태를 작성해도 전달되지 않습니다.',
    ],

    limits: [
      '본문에 텍스트 한 줄을 초과해 담을 수 없습니다.',
      '펼침 상태의 패널을 지정할 수 없습니다.',
      '다중 펼침 가능 여부를 지정할 수 없습니다.',
      '패널별 아이콘과 비활성 상태를 지정할 수 없습니다.',
    ],

    metrics: [
      { 대상: 'acdbox', 배경: '—',   보더: '없음',  radius: '—', 기타: 'margin-bottom 16' },
      { 대상: '아코디언', 배경: '—',  보더: '1px',   radius: '6', 기타: '' },
      { 대상: '패널 제목', 배경: '—',  보더: '—',    radius: '—', 기타: '높이 32 · 화살표 16×16(프레임워크)' },
      { 대상: '패널 본문', 배경: '—',  보더: '—',    radius: '—', 기타: '펼쳤을 때만 보입니다' },
    ],

    codeRef: 'ConvertedCodeEditor.tsx',
  },

  {
    chapter: 15, index: 1, id: 'form',
    name: '입력폼 (form)',
    summary: '입력 필드 16종을 상태별로 모아 둔 표. 필드 종류는 이름의 두 번째 조각이, 상태는 이름 어디에 있든 상태 단어가 정합니다.',
    capture: 'img/form.png',
    captureNote: 'Figma 템플릿 1864:9238 · 1540×533',
    figmaNodeId: '1864:9238',

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
   │  │  └ head_textbox         "인풋" — 행 제목
   │  ├ field_td_w2tb_td
   │  │  └ f_input_base         2번째 조각 "input" → 인풋
   │  ├ field_td_w2tb_td
   │  │  └ f_input_disabled     이름에 "disabled" → 비활성
   │  ├ field_td_w2tb_td
   │  │  └ f_input_readonly     이름에 "readonly" → 읽기전용
   │  ├ field_td_w2tb_td
   │  │  └ f_input_req          이름에 "req" → 필수
   │  └ field_td_w2tb_td
   │     └ f_input_error        이름에 "error" → 에러
   └ row_tr_w2tb_tr × 15        secret · textarea · select · selectnative · selectsel · multiselect ·
                                checkbox · radio · searchbox · inputcalendar · spinnertype1 ·
                                spinnertype2 · autocomplete · checkcombobox · fileupload`,
      points: [
        {
          t: '필드 종류는 두 번째 조각이 정합니다',
          d: '<code>f_input_base</code>의 <code>input</code>처럼 두 번째 조각이 컴포넌트 이름입니다(2장). ' +
             '표 구조 자체는 10장 입출력 테이블과 같으므로, 이 챕터에서 새로 볼 것은 <b>필드 이름 짓는 법</b>뿐입니다.',
        },
        {
          t: '상태는 이름 어디에 있어도 걸립니다',
          d: '이름을 <code>_</code>·공백 같은 구분자로 쪼갠 조각 중에 상태 단어가 있으면 그 상태가 됩니다 — ' +
             '<code>disabled</code>(또는 <code>dis</code>) · <code>readonly</code>(<code>ro</code>) · ' +
             '<code>req</code>(<code>required</code>) · <code>error</code>(<code>err</code>). ' +
             '<b>조각 단위 완전일치</b>라서 <code>disabled2</code>·<code>nodisabled</code>는 걸리지 않습니다.',
        },
        {
          t: '<b>필드에 붙인 클래스는 결과에 나가지 않습니다</b>',
          d: '변환기는 폼 필드마다 정해진 속성 세트를 만들어 내보내고, <b>이름의 클래스 자리는 쓰지 않습니다.</b> ' +
             '그래서 <code>f_input_base</code>의 <code>base</code>는 결과에 없습니다. 예외는 상태 둘뿐입니다 — ' +
             '<code>req</code>와 <code>error</code>는 <code>class="req"</code>·<code>class="error"</code>로 다시 붙습니다.',
        },
        {
          t: '셀렉트·스피너는 이름 안 단어로 종류가 갈립니다',
          d: '이름에 <code>selectnative</code>가 있으면 브라우저 기본 셀렉트, <code>selectsel</code>이면 커스텀 셀렉트가 됩니다. ' +
             '스피너는 이름에 <code>type2</code>가 있으면 두 번째 모양이 됩니다. ' +
             '템플릿은 이 단어를 두 번째 조각에 넣었지만(<code>f_selectnative_base</code>), <b>이름 어디에 있어도 걸립니다.</b>',
        },
        {
          t: '폭은 필드 종류가 정합니다',
          d: '이 템플릿은 칸마다 필드를 하나씩만 두었지만, 결과 폭은 칸이 아니라 <b>종류</b>가 정합니다 — ' +
             '인풋·비밀번호·조회상자·셀렉트·숫자 증감·업로드는 <code>width:100%</code>, 여러 줄 입력칸은 <code>100%</code>+높이 50, ' +
             '<b>날짜 입력칸은 120px 고정</b>, 다중선택·체크박스·라디오·자동완성·체크 콤보는 폭이 안 실립니다(5.2 · 21.4). ' +
             'Figma에서 그린 폭이 넘어가는 유일한 경우는 15.3에서 다룹니다.',
        },
      ],
    },

    xmlOut: {
      note: '인풋 한 행의 다섯 상태만 뽑았습니다. 필드마다 속성 세트가 달라 다른 종류는 결과 모습이 또 다릅니다.',
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
        '<b>비활성·읽기전용은 속성</b>(<code>disabled</code>·<code>readOnly</code>)이고 <b>필수·에러는 클래스</b>입니다. 넷이 같은 자리로 가지 않습니다.',
        '<code>f_input_base</code>의 <code>base</code>는 결과에 없습니다 — 폼 필드는 이름의 클래스를 쓰지 않습니다.',
        '필드 종류마다 붙는 속성이 다릅니다 — 셀렉트는 <code>allOption</code>·<code>appearance</code> 등 여덟 개가, 업로드는 이벤트 핸들러까지 붙습니다. 전부 변환기가 정하는 값입니다.',
      ],
    },

    pitfalls: [
      '<b>셀렉트·멀티셀렉트·체크박스·라디오·업로드는 비활성(<code>disabled</code>)으로 잠급니다.</b> 이 다섯은 이름에 <code>readonly</code>를 적어도 결과에 나가지 않습니다.',
      '<b>상태를 색으로만 표현하는 것</b> — 회색으로 칠하거나 빨간 테두리를 그려도 상태가 전달되지 않습니다. 상태는 이름에 적힌 단어로만 갑니다.',
      '<b>필드에 클래스를 붙여 모양을 바꾸려는 것</b> — 폼 필드는 이름의 클래스가 결과에 나가지 않습니다. 필드 모양은 컴포넌트 종류와 상태로만 갈립니다.',
      '<b>셀렉트 종류를 구분하려면 그 단어를 이름에 남깁니다</b> — <code>f_selectnative_base</code>·<code>f_selectsel_base</code>. 둘 다 그냥 <code>select</code>로 지으면 셋이 모두 같은 기본 셀렉트가 됩니다.',
      '<b>필드 폭을 Figma에서 맞추려 하지 않습니다</b> — 종류마다 정해진 값으로 나갑니다(21.4). 폭이 넘어가는 건 다른 요소와 같은 칸에 든 인풋뿐이라, 필요하면 15.3 구조로 그립니다.',
    ],

    limits: [
      '필드에 자체 클래스를 붙여 모양을 바꿀 방법이 없습니다(<code>req</code>·<code>error</code>만 예외).',
      '셀렉트·멀티셀렉트·체크박스·라디오·업로드에 읽기전용을 지정할 방법이 없습니다.',
      '체크박스·라디오는 항목 텍스트만 수집되고 어느 항목이 선택된 상태인지 전달할 방법이 없습니다.',
      '입력값의 형식(숫자·전화번호·자릿수 제한 등)을 전달할 방법이 없습니다.',
    ],

    codeRef: 'ConvertedCodeEditor.tsx · convert-xml.ts(applyFieldState)',
  },

  {
    chapter: 15, index: 2, id: 'form-etc',
    name: '기타 위젯 (form-etc)',
    summary: '토글·페이지컨트롤·진행바·날짜선택기·슬라이더. 표에 배치되지만 내부 구조가 결과에 반영되지 않는 위젯입니다.',
    capture: 'img/form-etc.png',
    captureNote: 'Figma 템플릿 1864:9754 · 1540×500',
    figmaNodeId: '1864:9754',

    build: {
      tree: `etc_group_tblbox
└ etc_table_w2tb tbl
   ├ row_tr_w2tb_tr
   │  ├ field_td_w2tb_td
   │  │  └ flip_fliptoggle       2번째 조각 "fliptoggle"
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
         └ sl_slider             2번째 조각 "slider"`,
      points: [
        {
          t: '다섯 위젯 모두 <b>내부 구조가 반영되지 않음</b>',
          d: '토글의 ON/OFF 텍스트, 페이지컨트롤의 화살표, 날짜선택기의 연·월·일 영역을 작성해도 결과에는 위젯 태그만 출력됩니다. ' +
             '실제 형태는 프레임워크가 생성하며, 4장의 목록에 다섯 항목이 모두 포함되어 있습니다.',
        },
        {
          t: '이름의 두 번째 조각만 지정',
          d: '<code>fliptoggle</code> · <code>pageControl</code> · <code>progressbar</code> · <code>datePicker</code> · <code>slider</code>를 사용하며 ' +
             '대소문자는 구분하지 않습니다(2장).',
        },
        {
          t: '<b>그리는 기준선 — 외형 한 겹</b>',
          d: '내부는 결과에 출력되지 않으나 빈 프레임으로 두면 화면에서 위젯 종류를 식별할 수 없습니다. ' +
             '<b>템플릿도 외형 한 겹만 작성되어 있습니다</b> — 토글은 ON/OFF 텍스트 하나, 페이지컨트롤은 이전·가운데·다음 세 영역, ' +
             '진행바는 막대와 라벨, 날짜선택기는 연·월·일 세 영역, 슬라이더는 <b>하위 항목 없이 막대 하나</b>로 구성합니다.',
        },
        {
          t: '진행바는 <code>type1</code>·<code>type2</code>로 형태 구분',
          d: '<code>prog_progressbar type1</code>과 같이 이름에 종류를 지정합니다. 템플릿은 두 종류를 한 셀에 병렬 배치하기 위해 ' +
             '<code>flex</code> 그룹으로 묶었으며, 해당 그룹은 셀 내 가로 배치를 위한 것입니다.',
        },
        {
          t: '진행률·현재 페이지 등의 값은 미전달',
          d: '진행바의 진행 상태나 페이지컨트롤의 현재 페이지를 작성해도 해당 값은 결과에 출력되지 않습니다. ' +
             '위젯의 표시 상태는 화면 실행 후 데이터가 결정합니다.',
        },
      ],
    },

    xmlOut: {
      note: '다섯 위젯 모두 하위 항목 없이 태그 하나로 출력되며 속성은 변환기가 결정합니다.',
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
        '하위 항목이 출력되지 않으며, 작성한 내부 구조가 결과에 반영되지 않음을 의미합니다.',
        '<code>flex</code> 그룹은 <code>class="flex"</code>로 출력되어 한 셀에 위젯 두 개를 가로로 배치하는 역할을 유지합니다.',
        '진행바만 <code>skin</code>으로 종류가 구분되며 나머지 네 위젯은 종류 구분이 없습니다.',
      ],
    },

    pitfalls: [
      '<b>토글·날짜선택기는 외형 한 겹까지만 작성합니다.</b> 내부는 결과에 반영되지 않으며, 4장의 「내부 구조가 반영되지 않는 컴포넌트」 목록에 포함되어 있습니다.',
      '<b>진행바는 이름에 종류를 지정합니다.</b> 두 번째 형태는 <code>type2</code>로 지정하며, 미지정 시 <code>type1</code>이 적용됩니다.',
      '한 셀에 위젯을 두 개 이상 배치할 때 <b><code>flex</code> 그룹으로 묶지 않으면</b> 가로 배치가 적용되지 않습니다.',
      '진행률·현재 페이지·슬라이더 위치 등의 값은 작성해도 전달되지 않습니다.',
    ],

    limits: [
      '진행률·현재 페이지·슬라이더 값은 지정할 수 없습니다.',
      '토글의 ON/OFF 텍스트는 변경할 수 없습니다.',
      '날짜선택기의 표시 단위는 지정할 수 없습니다.',
      '진행바를 제외한 네 위젯은 종류·형태 변형이 없습니다.',
    ],

    codeRef: 'ConvertedCodeEditor.tsx',
  },

  {
    chapter: 15, index: 3, id: 'form-combo',
    name: '입력폼(조합형) (form-combo)',
    summary: '한 셀에 복수 요소를 병렬 배치하는 구조. 인풋의 측정 폭이 결과에 출력되는 유일한 경우이며 구분자도 하나의 요소로 작성합니다.',
    capture: 'img/form-combo.png',
    captureNote: 'Figma 템플릿 1864:9839 · 1540×239',
    figmaNodeId: '1864:9839',

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
      │  ├ field_td_w2tb_td
      │  │  ├ sb_button_btn_cm search icon
      │  │  └ in_input             ← 칸에 요소가 둘이라 잰 폭이 실립니다(5.2)
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
          t: '<b>셀에 요소가 복수인 경우 인풋에 측정 폭이 출력</b>',
          d: '5.2의 규칙이 적용되는 항목입니다. 인풋은 셀에 단독 배치 시 <code>width:100%</code>이지만 ' +
             '<b>다른 요소와 함께 배치되면 Figma 측정 폭</b>이 출력됩니다. 본 템플릿의 인풋은 148px로 출력됩니다. ' +
             '<b>입력달력의 120px은 측정값이 아니라 고정값</b>이므로 단독 배치 시에도 동일합니다.',
        },
        {
          t: '구분자는 텍스트 요소로 작성',
          d: '기간의 <code>~</code>나 이메일의 <code>@</code>는 <code>sep_textbox</code>와 같이 <b>텍스트 컴포넌트</b>로 작성합니다. ' +
             '해당 텍스트가 결과에 출력되어 필드 사이에 배치됩니다.',
        },
        {
          t: '버튼도 동일 셀에 배치',
          d: '조회 버튼이 포함된 입력칸은 <b>버튼과 인풋을 동일 셀에</b> 배치합니다. 버튼은 13장 규칙을 따르므로 ' +
             '아이콘 전용인 경우 <code>icon</code> 토큰을 지정하고 텍스트를 배치하지 않습니다.',
        },
        {
          t: '배치 순서는 레이어 순서를 따름',
          d: '셀 내부의 버튼·인풋 배치 순서는 <b>레이어 패널 순서</b>가 결정합니다(4장). ' +
             '템플릿은 버튼을 먼저 배치해 좌측에 표시되도록 구성했습니다.',
        },
        {
          t: '상태는 요소별로 지정',
          d: '셀 전체를 비활성으로 처리하려면 <b>셀 내부 요소 각각의 이름에</b> <code>disabled</code>를 지정합니다. ' +
             '템플릿도 입력달력 두 개에 개별 지정되어 있습니다. 셀이나 행에 지정해도 하위 요소에 적용되지 않습니다.',
        },
      ],
    },

    xmlOut: {
      note: '한 셀에 요소가 복수인 경우의 폭 적용을 확인하는 용도입니다.',
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
        '<b>인풋에 <code>width:148px</code>가 출력되었습니다.</b> 셀에 요소가 두 개이므로 <code>width:100%</code>가 적용되지 않은 결과입니다(5.2). 측정 폭이 출력되는 경우는 이 조건뿐입니다.',
        '<b>입력달력의 <code>width: 120px</code>은 측정값이 아닙니다.</b> 날짜 입력칸은 배치 위치와 무관하게 해당 고정값이 적용됩니다.',
        '구분자는 <code>&lt;w2:textbox label="~"&gt;</code>로 필드 사이에 출력됩니다.',
        '<code>disabled="true"</code>가 입력달력마다 개별 출력되며, 셀이 아니라 요소별로 지정해야 하는 근거입니다.',
        '버튼은 13장과 동일한 형태로 출력되며, 아이콘 전용이므로 라벨이 비어 있습니다.',
      ],
    },

    pitfalls: [
      '<b>작성한 폭을 출력하려면 인풋을 다른 요소와 동일 셀에 배치합니다</b>(5.2). 인풋이 셀에 단독 배치되면 작성 폭과 무관하게 <code>width:100%</code>가 적용되며, <b>인풋 외의 필드는 이 방법으로도 폭이 변경되지 않습니다.</b>',
      '<b>비활성은 셀이나 행 이름에 지정하지 않습니다.</b> 하위 요소에 적용되지 않으므로 요소별로 개별 지정합니다.',
      '<b>구분자는 텍스트 레이어로 작성합니다.</b> 셀의 여백이나 배경으로 표현하면 결과에 출력되지 않습니다.',
      '<b>셀 내부 요소는 레이어 순서를 의도한 순서로 지정합니다.</b> 결과는 캔버스 위치가 아니라 레이어 순서를 따릅니다(4장).',
    ],

    limits: [
      '셀 내부 요소 간 간격은 클래스(CSS)가 결정합니다.',
      '인풋 폭은 Figma 측정값이 px로 출력되므로 <b>퍼센트나 최소·최대 폭으로는 지정할 수 없습니다.</b>',
      '15.1의 제약이 동일하게 적용됩니다 — 필드 클래스 미반영, 일부 필드의 읽기전용 미지원.',
    ],

    codeRef: 'ConvertedCodeEditor.tsx',
  },

  {
    chapter: 16, index: 1, id: 'cal-input',
    name: '날짜 입력칸 (inputcalendar)',
    summary: '셀 안에 배치하는 날짜 입력 요소. 날짜 단위와 브라우저 기본형을 지정할 수 없으며 항상 연·월·일로 출력됩니다.',
    capture: 'img/cal-input.png',
    captureNote: 'Figma 템플릿의 <code>ic_inputcalendar</code> 요소 · 120 × 24',
    figmaNodeId: '1864:9990',

    build: {
      tree: `fld_td_w2tb_td                          값셀 — 표 작성 규칙은 8장 · 10장 · 15장
└ ic_inputcalendar                      두 번째 조각 "inputcalendar"
                                        120 × 24 · 하위 레이어 없음
`,
      points: [
        {
          t: '<b>날짜 단위와 <code>native</code>는 지정할 수 없습니다</b>',
          d: '변환기는 날짜 입력칸에 대해 <code>calendarValueType="yearMonthDate"</code>와 <code>renderType=""</code>를 <b>고정 출력</b>합니다. ' +
             '이름에 <code>yearMonth</code>나 <code>native</code>를 지정해도 결과는 변하지 않습니다. ' +
             '<b>단위 지정은 펼친 달력(16.2·16.3)에만 적용됩니다.</b>',
        },
        {
          t: '폭은 120px 고정입니다',
          d: '<code>style="width: 120px;"</code>이 배치 위치와 무관하게 적용됩니다. Figma 측정 폭은 반영되지 않습니다(5.2). ' +
             '예외는 <b>한 셀에 다른 요소와 함께 배치한 경우</b>이며, 이때는 측정 폭이 출력됩니다(15.3).',
        },
        {
          t: '상태는 폼 필드 공통 규칙을 따릅니다',
          d: '<code>disabled</code>·<code>readonly</code>·<code>req</code>·<code>error</code> 네 가지를 이름에 지정합니다. ' +
             '지정 방식과 출력 형태는 15장과 동일하며, 템플릿에도 <code>f_inputcalendar_req</code>·<code>_error</code>·' +
             '<code>_readonly</code>·<code>_disabled</code>가 상태별로 작성되어 있습니다(15.1).',
        },
      ],
    },

    xmlOut: {
      note: '이름에 무엇을 지정하든 <code>calendarValueType</code>과 <code>renderType</code>은 아래 값으로 고정됩니다.',
      code: `<w2:inputCalendar calendarValueType="yearMonthDate" focusOnDateSelect="false"
  footerDiv="true" renderDiv="true" renderType="" rightAlign="false"
  style="width: 120px;"></w2:inputCalendar>

<!-- 비활성 -->
<w2:inputCalendar … disabled="true" style="width: 120px;"></w2:inputCalendar>`,
      points: [
        '자식이 없습니다 — 달력 아이콘을 작성해도 결과 구조에 포함되지 않습니다.',
        '펼친 달력(<code>calendar</code>)은 <code>&lt;w2:calendar&gt;</code>로 출력되며 속성 세트가 다릅니다(16.2).',
      ],
    },

    pitfalls: [
      '<b>셀 안에 배치하는 요소를 <code>calendar</code>로 지정하지 않습니다.</b> 해당 위치에 화면 폭의 달력이 펼쳐집니다.',
      '<b>기본 날짜나 선택 가능 범위가 정해져 있으면 화면 전달 시 별도로 명시합니다.</b> 레이어로 지정할 방법이 없습니다.',
    ],

    limits: [
      '날짜 단위(연·월만, 초까지 등)를 지정할 방법이 없습니다.',
      '기본값·선택 가능 범위·공휴일 표시를 지정할 방법이 없습니다.',
      '브라우저 기본형(<code>native</code>)으로 전환할 방법이 없습니다.',
    ],

    codeRef: 'ConvertedCodeEditor.tsx',
  },

  {
    chapter: 16, index: 2, id: 'cal-open',
    name: '펼친 달력 (calendar)',
    summary: '화면에 펼쳐 배치하는 달력. 날짜 단위를 이름으로 지정하며 내부 구조는 결과에 반영되지 않습니다.',
    capture: 'img/cal-open.png',
    captureNote: 'Figma 템플릿의 <code>cw_calendar_w2calendar</code> 요소 · 256 × 288 (단위 미지정 = 연·월·일)',
    figmaNodeId: '1864:9990',

    build: {
      tree: `fld_td_w2tb_td
└ cw_calendar_w2calendar                    두 번째 조각 "calendar" → 펼친 달력
                                            클래스에 날짜 단위를 이어 지정합니다:
                                            yearMonth · yearMonthDateHour ·
                                            yearMonthDateTime · yearMonthDateTimeSec
                                            (지정하지 않으면 연·월·일)`,
      points: [
        {
          t: '날짜 단위는 이름 전체에서 판정합니다',
          d: '변환기는 조각을 나누지 않고 <b>이름 전체를 소문자로 변환해 포함 여부</b>를 확인합니다. ' +
             '따라서 클래스 위치에 지정하든 접두어에 지정하든 동일하게 인식됩니다. ' +
             '판정 순서는 <b>긴 값부터</b>이므로 <code>yearMonthDateTimeSec</code>가 <code>yearMonth</code>보다 먼저 매칭됩니다.',
        },
        {
          t: '지정 가능한 값은 여섯 가지입니다',
          d: '<code>yearMonthDateTimeSec</code> · <code>yearMonthDateTime</code> · <code>yearMonthDateHour</code> · ' +
             '<code>yearMonthDate</code> · <code>yearMonth</code> · <code>year</code>. ' +
             '<b>어느 것도 지정하지 않으면 <code>yearMonthDate</code>(연·월·일)</b>가 적용됩니다. ' +
             '템플릿은 <code>year</code>를 제외한 다섯 가지를 작성해 두었습니다.',
        },
        {
          t: '<b>그리는 기준선 — 머리 + 요일 한 줄</b>',
          d: '헤더·요일·날짜 칸을 개별 작성해도 결과에는 달력 태그 하나만 출력됩니다(4장의 목록에 포함). ' +
             '다만 빈 프레임으로 두면 인수자가 해당 위치의 용도를 식별할 수 없으므로, ' +
             '<b>연월 표시와 좌우 이동 버튼(머리), 요일 한 줄까지 작성하고 날짜 격자는 생략합니다.</b> ' +
             '템플릿은 날짜까지 작성해 달력 한 벌에 130~147개 레이어를 사용했으나, 그 범위까지는 필요하지 않습니다.',
        },
      ],
    },

    xmlOut: {
      note: '단위별로 <code>calendarValueType</code>만 달라집니다.',
      code: `<!-- 연·월·일 (단위 미지정 시 기본) -->
<w2:calendar calendarValueType="yearMonthDate" footerDiv="false" id="" style=""></w2:calendar>

<!-- 연·월 -->
<w2:calendar calendarValueType="yearMonth" footerDiv="false" id="" style=""></w2:calendar>

<!-- 초까지 -->
<w2:calendar calendarValueType="yearMonthDateTimeSec" footerDiv="false" id="" style=""></w2:calendar>`,
      points: [
        '자식이 없습니다 — 작성한 달력 내부는 결과 구조에 포함되지 않습니다.',
        '<code>footerDiv</code>는 <code>false</code>로 고정 출력됩니다(날짜 입력칸은 <code>true</code>).',
        '상태(<code>disabled</code> 등)는 처리되지 않습니다 — 폼 필드 상태 규칙이 적용되지 않는 컴포넌트입니다.',
      ],
    },

    pitfalls: [
      '<b>이름 어디에든 <code>year</code>가 포함되면 연 단위로 판정됩니다.</b> 이름 전체를 대상으로 포함 여부를 확인하므로, 접두어나 클래스에 해당 단어를 사용하지 않습니다(부록 21.3).',
      '<b>셀 안에 배치하는 날짜 입력에는 사용하지 않습니다.</b> 해당 용도는 <code>inputcalendar</code>입니다(16.1).',
      '<b>기본 날짜나 선택 가능 범위가 정해져 있으면 화면 전달 시 별도로 명시합니다.</b> 레이어로 지정할 방법이 없습니다.',
    ],

    limits: [
      '기본값·선택 가능 범위·공휴일 표시를 지정할 방법이 없습니다.',
      '달력의 크기와 영역 형태는 클래스(CSS)가 결정합니다.',
      '요일 시작 지정과 같은 설정을 전달할 방법이 없습니다.',
    ],

    codeRef: 'ConvertedCodeEditor.tsx',
  },

  {
    chapter: 16, index: 3, id: 'cal-native',
    name: '브라우저 기본형 (native)',
    summary: '펼친 달력을 브라우저가 제공하는 날짜 입력으로 전환하는 이름 토큰. Figma 작성 방식은 16.2와 동일합니다.',
    capture: 'img/cal-native.png',
    captureNote: 'Figma 템플릿의 <code>cw_calendar_w2calendar native</code> 요소 · 256 × 288 — 16.2와 같은 단위, 이름만 다릅니다',
    figmaNodeId: '1864:9990',

    build: {
      tree: `fld_td_w2tb_td
└ cw_calendar_w2calendar native             이름에 native를 이어 지정합니다
                                            단위와 함께 지정할 수도 있습니다 —
                                            cw_calendar_w2calendar yearMonth native`,
      points: [
        {
          t: '<code>native</code>는 별도의 컴포넌트가 아니라 이름 토큰입니다',
          d: '두 번째 조각은 동일하게 <code>calendar</code>이며, 이름에 <code>native</code>가 포함되면 ' +
             '결과에 <code>renderType="native"</code>가 추가됩니다. ' +
             '<b>날짜 단위 지정 방식은 16.2와 완전히 동일합니다.</b>',
        },
        {
          t: '<b>Figma 작성 형태는 16.2와 같습니다</b>',
          d: '결과 화면에서는 프레임워크가 생성한 달력 대신 <b>브라우저가 제공하는 날짜 입력</b>이 표시되지만, ' +
             '그 형태는 브라우저마다 다르므로 Figma에서 재현할 대상이 아닙니다. ' +
             '<b>템플릿도 두 열을 동일한 형태로 작성하고 이름의 <code>native</code> 유무로만 구분</b>했습니다 — ' +
             '16.2와 본 항목의 캡처가 같아 보이는 것은 오류가 아닙니다.',
        },
      ],
    },

    xmlOut: {
      note: '16.2의 출력에 <code>renderType</code> 한 가지가 추가됩니다.',
      code: `<!-- 브라우저 기본형 (연·월·일) -->
<w2:calendar calendarValueType="yearMonthDate" footerDiv="false" id="" style="" renderType="native"></w2:calendar>

<!-- 브라우저 기본형 (연·월) -->
<w2:calendar calendarValueType="yearMonth" footerDiv="false" id="" style="" renderType="native"></w2:calendar>`,
      points: [
        '<code>renderType="native"</code>는 이름에 <code>native</code>가 포함된 경우에만 추가됩니다.',
      ],
    },

    pitfalls: [
      '<b>레이어 이름 전체에서 <code>native</code>를 확인합니다.</b> 접두어나 다른 용도의 단어에 해당 문자열이 포함되면 의도하지 않게 브라우저 기본형으로 전환됩니다.',
      '<b>브라우저 기본형의 실제 형태는 Figma로 지정할 수 없습니다.</b> 표시 형태는 사용자의 브라우저가 결정하므로 Figma 캔버스의 형태와 결과 화면이 다릅니다.',
      '<b>날짜 입력칸에 <code>native</code>를 지정해도 반영되지 않습니다</b>(16.1).',
    ],

    limits: [
      '브라우저 기본 날짜 입력의 형태·문구·동작을 지정할 방법이 없습니다.',
    ],

    codeRef: 'ConvertedCodeEditor.tsx',
  },

  {
    chapter: 18, index: 1, id: 'message',
    name: '메시지 (message)',
    summary: '안내·오류 문구와 목록. 위젯이 아니라 클래스로만 구성하는 요소입니다.',
    capture: 'img/message.png',
    captureNote: 'Figma 템플릿 1864:11373 · 1540×562',
    figmaNodeId: '1864:11373',

    build: {
      tree: `msg_group                  (섹션 묶음 — 클래스 없음)
├ msgtitle_group_titbox
├ msgtxt_group                        한 줄 안내 문구 4종
│  ├ t_textbox_txt_info
│  │  ├ ico_msg_info                  (장식 — 매핑 안 됨, 아이콘은 CSS가 그립니다)
│  │  └ t_lbl                         "Info"
│  ├ t_textbox_txt_error
│  ├ t_textbox_txt_success
│  └ t_textbox_txt_warning
├ m_group_msgbox info                 박스형 메시지 — 클래스에 종류를 이어 적습니다
│  ├ ico_msg_info                      (장식 — 매핑 안 됨)
│  └ m_textbox_txt_msg                 문구
├ m_group_msgbox error                 (error · success · warning · 종류 없는 기본)
├ lb_group_listbox                     불릿 목록
│  ├ li_group
│  │  └ li_textbox                     "텍스트 텍스트"
│  └ li_group × 3
├ lb_group_listbox hyphen              하이픈 목록
├ lb_group_listbox no_dot              기호 없는 목록
└ tt_group_tblbox                      툴팁 예시(표로 그렸습니다)`,
      points: [
        {
          t: '한 줄 안내는 텍스트에 클래스만 지정',
          d: '<code>txt_info</code>·<code>txt_error</code>·<code>txt_success</code>·<code>txt_warning</code> 네 가지입니다. ' +
             '선행 아이콘은 클래스의 CSS가 생성하므로 <b>텍스트에 클래스만 지정하면 됩니다.</b>',
        },
        {
          t: '박스형은 <code>msgbox</code>에 종류를 함께 지정',
          d: '<code>m_group_msgbox info</code>와 같이 <code>msgbox</code> 뒤에 <code>info</code>·<code>error</code>·<code>success</code>·<code>warning</code>을 공백으로 구분해 지정합니다. ' +
             '<b>종류를 지정하지 않으면 색상이 적용되지 않은 기본 박스</b>로 출력됩니다.',
        },
        {
          t: '<b>목록은 <code>listbox</code> 클래스 지정 시 태그가 자동 추가</b>',
          d: '<code>listbox</code> 클래스가 지정된 그룹은 <code>&lt;ul&gt;</code>로, <b>직속 하위 그룹은 각각 <code>&lt;li&gt;</code></b>로 처리됩니다. ' +
             '7장 브레드크럼과 동일한 방식입니다. 불릿 기호는 CSS가 생성하므로 <b>도형으로 작성하지 않습니다.</b>',
        },
        {
          t: '목록 종류는 클래스 토큰이 결정',
          d: '<code>listbox</code>만 지정하면 불릿, <code>listbox hyphen</code>은 하이픈, <code>listbox no_dot</code>은 기호 없음으로 적용됩니다.',
        },
        {
          t: '툴팁은 본 컴포넌트로 구성할 수 없음',
          d: '템플릿의 툴팁 예시는 <b>표(<code>tblbox</code>)로 작성된 것</b>입니다. 마우스 오버 시 표시되는 안내는 ' +
             'Figma로 전달할 수 없습니다(7장 참조).',
        },
      ],
    },

    xmlOut: {
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
        '<code>tagname="ul"</code>·<code>tagname="li"</code>는 변환기가 추가한 값이며 이름에 지정하지 않아도 출력됩니다.',
        '<code>li</code>에는 <code>style</code>이 출력되지 않습니다. 오토레이아웃 측정값이 적용되면 불릿 위치가 어긋나므로 변환기가 제거합니다.',
        '<code>ico_msg_*</code> 아이콘 레이어는 결과에 출력되지 않으며 아이콘은 클래스의 CSS가 생성합니다.',
      ],
    },

    pitfalls: [
      '<b>불릿 기호는 작성하지 않습니다.</b> 기호는 <code>listbox</code> 클래스의 CSS가 생성하며, 도형으로 작성하면 매핑되지 않습니다.',
      '<b>목록 그룹에는 <code>listbox</code> 클래스를 지정합니다.</b> 누락 시 <code>ul</code>/<code>li</code>가 아닌 일반 그룹으로 출력되어 불릿과 줄 간격이 적용되지 않습니다.',
      '항목을 <code>listbox</code>의 <b>직속 하위</b>가 아닌 위치에 배치하면 <code>li</code>가 적용되지 않습니다.',
      '<code>msgbox</code>의 종류 토큰을 <code>msgbox_info</code>와 같이 밑줄로 연결하면 다른 클래스로 처리됩니다. <b>공백</b>으로 구분해 지정합니다.',
    ],

    limits: [
      '마우스 오버 시 표시되는 툴팁은 전달할 수 없습니다.',
      '메시지 종류는 네 가지(<code>info</code>·<code>error</code>·<code>success</code>·<code>warning</code>)로 한정됩니다.',
      '목록의 기호 형태와 들여쓰기는 클래스(CSS)가 결정합니다.',
      '목록 항목을 중첩해 하위 목록을 구성하는 기능은 지원하지 않습니다.',
    ],

    codeRef: 'ConvertedCodeEditor.tsx',
  },

  {
    chapter: 18, index: 2, id: 'widget',
    name: '위젯 컨테이너 (widget)',
    summary: '카드형 위젯을 격자에 배치하는 영역. 위젯은 XML이 아니라 화면 실행 시 스크립트가 생성합니다.',
    capture: 'img/widget.png',
    captureNote: 'Figma 템플릿 1864:11457 · 1540×685',
    figmaNodeId: '1864:11457',

    build: {
      tree: `wc_group                  (섹션 묶음 — 클래스 없음)
├ wctitle_group_titbox
└ wc_widget_w2widgetContainer          2번째 조각 "widget" → 위젯 컨테이너
   ├ wgt_group_w2widget                이름이 "w2widget"으로 끝나야 위젯으로 셉니다
   │  ├ wgt_title_w2widget_title       이름에 "w2widget_title" 포함 → 위젯 제목
   │  └ wgt_content_w2widget_content   속은 결과에 반영되지 않습니다
   ├ wgt_group_w2widget                (같은 구조로 여러 개)
   └ wgt_group_w2widget`,
      points: [
        {
          t: '<b>위젯 이름은 <code>w2widget</code>으로 종료</b>',
          d: '컨테이너의 직속 하위 항목 중 <b>이름이 <code>w2widget</code>으로 종료되는</b> 항목만 위젯으로 계산됩니다. ' +
             '<code>w2widget_box</code>와 같이 접미가 추가되면 위젯으로 인식되지 않습니다.',
        },
        {
          t: '제목은 <code>w2widget_title</code>이 포함된 레이어에서 추출',
          d: '위젯 내부에서 <b>이름에 <code>w2widget_title</code>이 포함된 레이어</b>를 탐색해 내부 첫 텍스트를 제목으로 적용합니다. ' +
             '해당 레이어가 없으면 <code>title</code>이 적용됩니다.',
        },
        {
          t: '<b>배치는 캔버스 위치가 아니라 레이어 순서가 결정</b>',
          d: '위젯은 <b>레이어 순서대로</b> 격자에 배치됩니다. 가로 3칸이 기본이므로 네 번째 위젯이 두 번째 행의 첫 칸에 배치됩니다. ' +
             'Figma의 배치 위치는 결과에 영향을 주지 않으므로 <b>표시 순서와 레이어 순서를 일치시켜야</b> 결과가 캡처와 동일해집니다.',
        },
        {
          t: '<b>그리는 기준선 — 제목 줄 + 빈 본문 박스</b>',
          d: '<code>w2widget_content</code> 안에 차트·표를 그려도 결과 XML에는 들어가지 않습니다 — 전달되는 것은 <b>위젯의 개수와 제목</b>뿐입니다. ' +
             '그래도 <b>위젯마다 제목 줄과 본문 자리(빈 박스)까지는 그립니다.</b> 그래야 몇 칸짜리 격자인지 보는 사람이 압니다. ' +
             '본문 안 차트·표는 생략합니다.',
        },
        {
          t: '컨테이너 크기·클래스는 변환기가 결정',
          d: '컨테이너는 <b>클래스가 제거되고</b> 크기가 고정값으로 출력됩니다. 런타임 클래스가 XML에 포함되면 위젯 재초기화 시 오류가 발생하기 때문입니다.',
        },
      ],
    },

    xmlOut: {
      note: '컨테이너는 <b>빈 태그</b>로 출력되며 위젯은 화면 실행 시 스크립트가 생성합니다. 따라서 XML만으로는 위젯이 확인되지 않습니다.',
      code: `<w2:widgetContainer id="widgetSample" style="width:100%;height:610px;"></w2:widgetContainer>

<!-- 화면이 열릴 때 실행되는 부분 -->
var widgetOptions1 = {};
widgetOptions1.id = "wg_widget1";
widgetOptions1.title = "위젯 제목";
widgetOptions1.x = 0;   widgetOptions1.y = 0;
widgetSample.addWidgets(widgetOptions1);

var widgetOptions2 = {};
widgetOptions2.title = "위젯 제목";
widgetOptions2.x = 1;   widgetOptions2.y = 0;
widgetSample.addWidgets(widgetOptions2);
…`,
      points: [
        '컨테이너 태그에 하위 항목이 없습니다. 위젯은 마크업이 아니라 <b>스크립트로</b> 추가됩니다.',
        '<code>x</code>·<code>y</code>는 레이어 순서에서 계산된 값입니다(가로 3칸 기준: 0·0 → 1·0 → 2·0 → 0·1). Figma 좌표와 무관합니다.',
        '<code>class</code>가 출력되지 않으며 변환기가 제거합니다.',
        '<code>w2widget_title</code>·<code>w2widget_content</code> 레이어는 결과 XML에 출력되지 않습니다.',
      ],
    },

    pitfalls: [
      '<b>이름이 <code>w2widget</code>으로 종료되지 않으면 위젯으로 계산되지 않으며</b> 해당 위젯은 화면에 표시되지 않습니다.',
      '<b>Figma의 배치 위치 변경으로는 결과 배치가 변경되지 않습니다.</b> 배치는 레이어 순서가 결정하므로 순서를 변경합니다.',
      '<b>본문 내 차트·표는 작성하지 않습니다.</b> 제목 줄과 빈 본문 영역까지만 작성하며, 결과에 전달되는 항목은 개수와 제목입니다.',
      '<b>제목 레이어 이름에는 <code>w2widget_title</code>을 지정합니다.</b> 미지정 시 제목이 <code>title</code>로 출력됩니다.',
    ],

    limits: [
      '위젯 내부 내용은 전달할 수 없습니다.',
      '위젯의 점유 칸 수는 지정할 수 없으며 모두 1칸으로 적용됩니다.',
      '컨테이너의 높이는 지정할 수 없습니다(고정값).',
      '위젯의 접힘·닫힘 상태는 지정할 수 없습니다.',
    ],

    codeRef: 'ConvertedCodeEditor.tsx',
  },

  {
    chapter: 18, index: 3, id: 'floatinglayer',
    name: '떠 있는 레이어 (floatinglayer)',
    summary: '화면 위에 표시되는 창. 제목만 전달되며 내부 구조는 결과에 반영되지 않습니다.',
    capture: 'img/floatinglayer.png',
    captureNote: 'Figma 템플릿 1864:11566 · 1540×325',
    figmaNodeId: '1864:11566',

    build: {
      tree: `fl_group                  (섹션 묶음 — 클래스 없음)
├ fltitle_group_titbox
└ fl_floatinglayer_w2floatingLayer     2번째 조각 "floatinglayer"
   ├ fl_titlebar
   │  ├ fl_title_text                  "Title" ← 창 제목이 됩니다
   │  └ fl_close_ico_pop_close          (장식 — 닫기 버튼은 프레임워크가 그립니다)
   └ fl_content                         속은 결과에 반영되지 않습니다`,
      points: [
        {
          t: '제목만 전달',
          d: '레이어 내부에서 <b>처음 확인되는 텍스트</b>가 창 제목으로 적용됩니다. 텍스트가 없으면 <code>Title</code>이 적용되며, ' +
             '제목 외의 항목은 전달되지 않습니다.',
        },
        {
          t: '<b>그리는 기준선 — 제목바 + 빈 본문</b>',
          d: '제목바·닫기 버튼·본문을 그려도 결과에는 레이어 태그 하나만 나갑니다(4장의 목록에 있습니다). ' +
             '그래도 <b>제목바(제목 글자 + 닫기 아이콘)와 빈 본문 박스까지는 그립니다</b> — 템플릿도 딱 그만큼(하위 4개)입니다. ' +
             '창 안에 들어갈 내용은 개발 단계에서 채웁니다.',
        },
        {
          t: '크기·위치도 고정값으로 출력',
          d: '결과에 <code>position:absolute</code>와 함께 <b>300×300</b>이 고정 적용됩니다. ' +
             'Figma에서 다른 크기로 작성해도 해당 값이 적용됩니다.',
        },
        {
          t: '하위 요소와 중첩되어 표시',
          d: '떠 있는 레이어는 <b>absolute 요소</b>이므로 하위 요소 위에 표시됩니다. ' +
             'Figma에서 하단에 여백을 확보해도 해당 여백은 결과에 출력되지 않으므로(5장), ' +
             '<b>필요한 여백은 화면 전달 시 별도로 전달합니다.</b>',
        },
      ],
    },

    xmlOut: {
      code: `<w2:floatingLayer id="" title="Title"
                  style="position:absolute;width: 300px;height: 300px;"></w2:floatingLayer>`,
      points: [
        '하위 항목이 출력되지 않으며 제목바·닫기·본문이 모두 결과에 반영되지 않습니다.',
        '<code>title</code> 속성에 작성한 첫 텍스트가 적용되었습니다.',
        '크기와 <code>position:absolute</code>는 변환기가 적용하는 고정값입니다.',
      ],
    },

    pitfalls: [
      '<b>창 내부 내용은 작성하지 않습니다.</b> 제목바와 빈 본문까지만 작성하며 제목만 결과에 전달됩니다.',
      '<b>제목바에는 텍스트를 하나만 배치합니다.</b> 복수 배치 시 첫 번째만 제목으로 적용됩니다.',
      '<b>창 크기가 지정되어야 하는 경우 화면 전달 시 별도로 전달합니다.</b> Figma에서 조정해도 결과는 300×300으로 출력됩니다.',
      '닫기 버튼·최소화 버튼은 작성해도 전달되지 않으며 프레임워크가 생성합니다.',
    ],

    limits: [
      '창 내부 내용은 전달할 수 없습니다.',
      '창 크기와 초기 표시 위치는 지정할 수 없습니다.',
      '열림/닫힘 상태, 드래그 가능 여부 같은 동작을 전달할 방법이 없습니다.',
    ],

    codeRef: 'ConvertedCodeEditor.tsx',
  },

  {
    chapter: 17, index: 1, id: 'schedulecalendar',
    name: '스케쥴 캘린더 (schedulecalendar)',
    summary: '일정을 월 단위로 표시하는 달력. 이름만 규격에 맞추면 되며 내부는 프레임워크가 생성합니다.',
    capture: 'img/schedulecalendar.png',
    captureNote: 'Figma 템플릿 1864:11579 · 1540×625',
    figmaNodeId: '1864:11579',

    build: {
      tree: `sc_group                  (섹션 묶음 — 클래스 없음)
├ sctitle_group_titbox
└ sc_schedulecalendar_w2scheduleCalendar    2번째 조각 "schedulecalendar"
   ├ cal_toolbar_fc-header-toolbar          (속 — 결과에 반영되지 않습니다)
   │  ├ cal_toolbar_left
   │  ├ cal_title_fc-toolbar-title
   │  └ cal_viewgroup_fc-button-group
   └ cal_grid_fc-view                       (속 — 반영되지 않습니다)
      ├ cal_weekhdr_fc-head
      └ cal_weekrow_fc-row × 5`,
      points: [
        {
          t: '이름 지정만으로 적용',
          d: '두 번째 조각을 <code>schedulecalendar</code>로 지정합니다. 툴바·요일 머리·주 단위 행을 작성해도 ' +
             '결과에는 <b>태그 하나</b>만 출력됩니다(4장 목록 참조).',
        },
        {
          t: '<b>그리는 기준선 — 툴바 + 요일 머리 + 주 한 줄</b>',
          d: '템플릿이 툴바와 격자를 상세히 작성한 것은 <b>디자인 캔버스에서 형태를 확인하기 위한 것</b>입니다. ' +
             '결과에는 반영되지 않으나 빈 프레임으로 두면 배치될 컴포넌트를 식별할 수 없습니다. ' +
             '<b>툴바(이동 버튼 · 제목 · 보기 전환)와 요일 머리 한 줄, 주 단위 행 한 줄까지</b> 작성하고 나머지 주는 생략합니다.',
        },
        {
          t: '일정 데이터는 미전달',
          d: '달력 영역에 일정을 작성해도 결과에 반영되지 않습니다. 표시할 일정은 화면 실행 후 데이터가 결정합니다.',
        },
      ],
    },

    xmlOut: {
      code: `<w2:scheduleCalendar … ></w2:scheduleCalendar>`,
      points: [
        '하위 항목 없이 태그 하나로 출력됩니다.',
        '속성은 변환기가 적용하는 표준 세트입니다.',
      ],
    },

    pitfalls: [
      '<b>주 단위 행을 전체 작성하지 않습니다.</b> 툴바·요일 머리·주 한 줄까지만 작성하며, 일정까지 작성하는 것은 본 컴포넌트에서 가장 불필요한 작업입니다.',
      '두 번째 조각을 <code>schedule_calendar</code>와 같이 분리해 지정하면 인식되지 않습니다.',
      '<b>초기 표시 형태(월/주/일)가 지정되어야 하는 경우 화면 전달 시 별도로 전달합니다.</b> 레이어로는 지정할 수 없습니다.',
    ],

    limits: [
      '일정 데이터와 초기 표시 형태는 전달할 수 없습니다.',
      '달력 높이와 영역 형태는 클래스(CSS)가 결정합니다.',
      '툴바의 버튼 구성은 지정할 수 없습니다.',
    ],

    codeRef: 'ConvertedCodeEditor.tsx',
  },

  {
    chapter: 18, index: 4, id: 'processbar',
    name: '진행 단계 (processbar)',
    summary: '여러 단계를 순서대로 표시하는 컴포넌트. 단계는 작성한 대로 출력되며 상태는 이름이 결정합니다.',
    capture: 'img/processbar.png',
    captureNote: 'Figma 템플릿 1864:11711 · 1540×129',
    figmaNodeId: '1864:11711',

    build: {
      tree: `pr_group                  (섹션 묶음 — 클래스 없음)
├ prtitle_group_titbox
└ pr_processbar_processbar             2번째 조각 "processbar"
   └ pr_steps
      ├ pr_step_finish                2번째 조각 "step" → 단계 하나 · 3번째 "finish" → 완료
      │  ├ pr_num_finish
      │  │  └ ico_process_finish       (장식 — 매핑 안 됨)
      │  ├ pr_dotwrap
      │  └ pr_label                    2번째 조각 "label" → 단계 이름
      ├ pr_step_on                    3번째 조각 "on" → 현재 단계
      │  ├ pr_num_on
      │  │  └ pr_num_text
      │  ├ pr_dotwrap_on              현재 단계에만 점 5개(pr_dot_on / pr_dot)
      │  └ pr_label
      ├ pr_step × 3                   3번째 조각이 없으면 아직 안 온 단계
      ├ pr_connector_on               단계와 형제로 둡니다 — 원과 원 사이를 잇는 막대
      └ pr_connector × 3              지나온 구간만 _on

   ※ 연결선이 원 사이에 겹쳐 놓이므로 pr_steps는 오토레이아웃이 아니라 자유 배치입니다.`,
      points: [
        {
          t: '단계는 두 번째 조각이 <code>step</code>인 프레임',
          d: '<code>pr_step_finish</code>와 같이 두 번째 조각이 <code>step</code>이면 단계 하나로 처리됩니다. ' +
             '<b>중첩 깊이와 무관하게 탐색되므로</b> 본 템플릿과 같이 <code>pr_steps</code>로 묶어도 됩니다.',
        },
        {
          t: '상태는 세 번째 조각이 결정',
          d: '<code>finish</code>는 완료, <code>on</code>은 현재 단계, <b>미지정은 미도달 단계</b>로 처리됩니다. ' +
             '본 챕터의 다른 위젯과 달리 <b>상태가 결과에 전달되는</b> 컴포넌트입니다.',
        },
        {
          t: '단계 이름은 <code>label</code>에서 추출',
          d: '단계 내부에서 두 번째 조각이 <code>label</code>인 레이어의 텍스트를 이름으로 적용합니다. ' +
             '해당 레이어가 없으면 <code>Step1</code>·<code>Step2</code> 형태의 순번이 적용됩니다.',
        },
        {
          t: '<b>번호·점·연결선은 결과에 출력되지 않으나 Figma에는 작성</b>',
          d: '단계 번호(<code>pr_num</code>)·진행 점(<code>pr_dotwrap</code>)·단계 간 연결선(<code>pr_connector</code>)은 ' +
             '<b>변환기가 순서대로 재생성하므로 작성한 항목이 결과 XML에 출력되지 않습니다.</b> ' +
             '단 누락하면 Figma 화면에 <b>라벨만 남아</b> 진행 단계로 식별되지 않습니다. ' +
             '인수자가 확인하는 대상은 해당 화면입니다(21.5). <b>템플릿과 동일하게 작성합니다.</b>',
        },
        {
          t: '단계를 순서대로 배치',
          d: '레이어 순서가 단계 순서로 적용되며 번호도 해당 순서로 부여됩니다(4장). ' +
             '완료·현재·미도달을 <b>좌측부터 순서대로</b> 배치합니다.',
        },
      ],
    },

    xmlOut: {
      note: '목록(<code>ul</code>/<code>li</code>) 구조로 출력되며 번호·점·클릭 이벤트를 변환기가 생성합니다.',
      code: `<xf:group tagname="ul" id="" style="" class="processbar">
  <xf:group tagname="li" ev:onclick="scwin.step1_onclick" id="step1" class="finish">
    <w2:span label="1" class="num"></w2:span>
    <xf:group class="dot_wrap"></xf:group>
    <w2:textbox label="단계이름"></w2:textbox>
  </xf:group>
  <xf:group tagname="li" ev:onclick="scwin.step2_onclick" id="step2" class="on">
    <w2:span label="2" class="num"></w2:span>
    <xf:group class="dot_wrap">
      <w2:span label="" class="dot on"></w2:span>
      <w2:span label="" class="dot on"></w2:span>
      <w2:span label="" class="dot"></w2:span>
      …
    </xf:group>
    <w2:textbox label="단계이름"></w2:textbox>
  </xf:group>
  <xf:group tagname="li" ev:onclick="scwin.step3_onclick" id="step3">
    …
  </xf:group>
</xf:group>`,
      points: [
        '<code>finish</code>·<code>on</code>이 <code>class</code>로 출력되며 미도달 단계에는 클래스가 적용되지 않습니다.',
        '단계 번호(<code>class="num"</code>)와 진행 점(<code>dot_wrap</code>)은 <b>변환기가 생성한 항목</b>이며 작성한 <code>pr_num</code>·<code>pr_dotwrap</code>이 아닙니다.',
        '점은 <b>현재 단계에만</b> 출력되며 해당 단계 번호만큼 활성화됩니다.',
        '<code>id="stepN"</code>과 클릭 이벤트 이름도 순번으로 자동 부여됩니다.',
      ],
    },

    pitfalls: [
      '<b>단계 레이어 이름의 두 번째 조각은 <code>step</code>으로 지정합니다.</b> 다른 값으로 지정하면 해당 단계가 결과에서 제외됩니다.',
      '<b>상태를 색상으로만 표현하지 않습니다.</b> 완료·현재를 색상으로 구분해 작성해도 전달되지 않으며, 세 번째 조각에 <code>finish</code>·<code>on</code>을 지정해야 합니다.',
      '<b>단계 이름 레이어의 두 번째 조각은 <code>label</code>로 지정합니다.</b> 다른 값으로 지정하면 이름이 <code>Step1</code> 형태의 순번으로 출력됩니다.',
      '<b><code>on</code>은 한 단계에만 지정합니다.</b> 복수 지정 시 모두 현재 단계로 처리됩니다.',
      '<b>번호·점·연결선을 생략하고 라벨만 작성하지 않습니다.</b> 결과 XML에는 변환기가 생성한 항목이 출력되지만, Figma 화면은 라벨만 남아 진행 단계로 식별되지 않습니다(21.5).',
      '<b>진행 점은 현재 단계에만 작성합니다.</b> 완료·미도달 단계의 <code>pr_dotwrap</code>은 빈 상태로 유지하며 결과도 동일합니다.',
    ],

    limits: [
      '진행 점의 개수와 형태는 지정할 수 없습니다.',
      '단계 클릭 시 동작(이벤트 이름)은 지정할 수 없으며 순번으로 자동 부여됩니다.',
      '단계를 세로로 배치할 수 없습니다.',
      '단계별 아이콘은 지정할 수 없습니다.',
    ],

    codeRef: 'ConvertedCodeEditor.tsx',
  },
];
