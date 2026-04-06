# COSMIC — 프로젝트 설계 스펙

## 시나리오

프레넬(Fresnel) 형태의 큰 원형이 페이지를 **무중력 느낌으로 유영**한다.
이 때 그라디언트는 레퍼런스 이미지처럼 **프레넬 형식의 그라디언트가 숨쉬듯 변화**한다.

---

## 이벤트

> **사용자가 클릭을 하면 작은 원이 등장하고 큰 원에 메타볼 느낌으로 흡수된다.
> 흡수가 완료되면 배경색이나 큰 원에 있는 그라디언트 효과가 변화된다.**

---

## 레퍼런스 비주얼 키워드

| 항목 | 설명 |
|------|------|
| **Fresnel 림** | 구체 외곽에 네온 Yellow-Green / Cyan 발광 |
| **인테리어 그라디언트** | Blue↔Orange-Red↔Purple 등 채도 높은 다색 존(Zone) |
| **메타볼** | 소형 구가 대형 구에 점성 유체처럼 흡수되는 SDF 블렌딩 |
| **호흡 애니메이션** | 색상과 밝기가 천천히 pulse — 살아있는 느낌 |
| **무중력 유영** | 리사주(Lissajous) 곡선 기반의 유기적 부유 |

---

## 기술 구현 방향

### 렌더링
- **WebGL + GLSL 프래그먼트 셰이더** — 모든 시각 연산을 GPU에서 처리
- 프레임당 단 **1번의 드로우콜** (풀스크린 쿼드)
- 최적화: 사전 할당 TypedArray, 불필요한 JS 연산 최소화

### 그라디언트
- 구체 내부에 **3개의 Hue 극점(Color Pole)** 이 각자 다른 속도로 공전
- **원형 평균(Circular Hue Blending)** 으로 블렌딩
  - RGB 공간 블렌딩 → 탁해짐 (Red + Blue = dark purple)
  - Hue 원형 평균 → vivid 유지 (Red + Blue = bright magenta)
- Golden Ratio(`× 0.618`) 기반 흡수 이후 팔레트 전환

### Fresnel 림
- SDF 거리값으로 엣지 계산 → 원주를 따라 무지개 네온 컬러 회전
- Overbright(v=2.8~3.2) + Reinhard 톤맵으로 발광 엣지 표현

### 메타볼 SDF
- **Polynomial smooth-min** (Inigo Quilez) 으로 SDF 블렌딩
- 미사용 슬롯: `radius = -9999` 트릭 → 분기 없이 8슬롯 고정 연산
- 흡수 시 `flash = 1.0` 백색 펄스 + 팔레트 위상(phase) 증가

### 부유 운동
- 두 주파수 **리사주 곡선** 합산 → 무중력 유영 궤적

### 클릭 이벤트
1. 소형 원 팝인 (elastic overshoot 진입 애니메이션)
2. 큰 원을 향해 추격 (거리에 비례한 가속)
3. 반경 내 진입 시 자동 수축 + 흡수
4. 흡수 완료 → `phase += 0.09~0.16`, 색상 팔레트 전환

---

## 최적화 포인트

- 픽셀 당 GPU 연산 집중, CPU는 상태(State) 관리만
- `smRad.fill(-9999)` 로 미사용 메타볼 슬롯 무비용 처리
- `requestAnimationFrame` 단일 루프
- `powerPreference: 'high-performance'` WebGL 컨텍스트 힌트
- 모바일: `touchstart` + `passive: false` 지원
