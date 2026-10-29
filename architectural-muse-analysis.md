# PEER-REVIEW GRADE ASSESSMENT: SINGLE-STOREY RESIDENTIAL DWELLING
**14.81m x 11.30m | Net Internal 122.42 m2 + Terrace 22.53 m2**
**Senior Principal BIM Architect / Licensed Structural Engineer Review**

## 0. EXECUTIVE SUMMARY & DOCUMENT BASIS

Reviewed document: dimensioned 2D floorplan, LOD 100 schematic.

Overall building typology: Single-storey, 4-bedroom, 2-bath, open-plan Living-Kitchen + covered South Terrace, North service spine, double-loaded central corridor. Rectangular footprint:

> Lx = 14.81 m [Axis 1-4] , Ly = 11.30 m [Axis A-D]
> Ly_interior ~ 9.22 m [Axis B-D] + 2.08 m South projection [Axis A-B]

Net-to-gross efficiency is high. Circulation: Corridor 6.25 + 10.46 = 16.71 m2 + Hallway 13.33 m2 = 30.04 m2 / 122.42 m2 = **24.5% circulation**. This is upper limit - acceptable for 4-bed single storey with privacy separation, but optimization possible.

**Verdict: Fundamentally sound parti - North wet-core / South day-zone - structurally feasible, code-compliant in principle, excellent passive potential. Critical structural attention required at 6.64m South living-room opening. MEP clustering is exemplary.**

Assumed orientation for analysis: **South = Axis-A side (Terrace), North = Axis-D side (Bedrooms/WC)** as stated in brief and confirmed by solar logic. Assumed latitude 44-46°N Continental, floor-to-ceiling h = 2.70m, window head H = 2.40m, sill 0.60-0.90m. Exterior walls assumed 250-300mm load-bearing confined masonry / Porotherm + RC tie-beams. Interior bearing 200mm, partitions 100-120mm. Roof assumed timber rafter / truss gable with ridge E-W.

All calculations require field verification - window schedules, lintel schedules, and geotechnical report not provided.

---

## 1. STRUCTURAL GRID & LOAD-BEARING ANALYSIS

### 1.1 Grid Definition

```
E-W Axes (transverse spans):
1 - 2 = 2.98 m [West entry bay]
2 - 3 = 6.64 m [Central living / terrace void - CRITICAL SPAN]
3 - 4 = 5.19 m [East bedroom bay]

N-S Axes (longitudinal):
D - C = 3.50 m [North bedroom / wet-core depth]
C - B = 5.72 m [Central living / hallway depth]
B - A = 2.08 m [South terrace / entry porch depth]
D - A = 11.30 m total
```

Grid is **non-modular tripartite**: 2.98 / 6.64 / 5.19. This is architectural, not structural optimum, but rational: small west cell stiff, large central public void, medium east private cell.

### 1.2 Hypothesized Load-Bearing System

For 14.81m long single-storey with pitched roof, only rational system:

**Ridge parallel to long axis (E-W, parallel to Axes 1-4), located approximately over Corridor north wall / Living north wall line, ~3.5-4.0m from North exterior wall (Axis-D).**

Load path:

```
Roof covering + snow -> Rafters / Trusses (spanning N-S)
  -> North eave wall plate on Axis-D exterior wall (bearing)
  -> South eave / intermediate support on Axis-B/C spine:
     a) North corridor wall [Axis ~C, Grid 2-3]: continuous bearing spine
     b) South exterior wall [Axis-B] with large openings
  -> Ridge beam (if purlin roof) -> Gable end walls Axis-1 and Axis-4 + internal cross-walls
  -> Strip footings -> Soil
```

Thus we have **3 longitudinal bearing lines**:
L1: North exterior (D) - continuous, low opening ratio ~15%, excellent.
L2: Central spine (C) - corridor north wall + WC dividing walls. Continuous except 3 doors 0.80-0.90m. This is primary internal spine carrying ~55-60% of roof load.
L3: South exterior (B) - highly perforated: entry door, kitchen window, 2.4-3.0m sliding doors to terrace, east bedroom windows. Opening ratio >45%. This is the weak line.

Transverse bearing / bracing lines:
T1: Axis-1 West exterior - continuous, stiff.
T2: Axis-2 - Hallway east wall / Kitchen west wall - load-bearing masonry with kitchen opening. Provides critical N-S shear transfer.
T3: Axis-3 - Living east wall / Corridor east wall - load-bearing, with cased opening to corridor. Critical for tying 6.64m void.
T4: Axis-4 East exterior - continuous.

### 1.3 Gravity Analysis - The 6.64m Void

South wall on Grid 2-3, Axis-B: clear opening for Living -> Terrace:

> L_clear = 6.64 m, assumed double sliding + fixed sidelights, lintel beam spanning column-to-column (Axis-2 pier to Axis-3 pier).

Tributary width for eave beam: approx half rafter span south of ridge:

```
trib = ~2.8 - 3.2 m
Assume: DL_roof = 1.20 kN/m2 [tile + timber + ceiling + insulation]
        LL_snow = 1.60 kN/m2 [Continental Zone II] + maintenance 0.30
        q_k = 3.10 kN/m2
Line load on lintel: w_k = q_k * trib = 3.10 * 3.0 = 9.30 kN/m
w_d = 1.35*DL*trib + 1.5*LL*trib = 1.35*1.2*3.0 + 1.5*1.9*3.0 = 4.86 + 8.55 = 13.41 kN/m
```

Bending:

```
M_max,d = w_d * L^2 / 8 = 13.41 * 6.64^2 / 8 = 13.41 * 44.09 / 8 = 73.9 kNm
V_max,d = w_d * L / 2 = 13.41 * 6.64 / 2 = 44.5 kN
Deflection limit for masonry support + sliding doors: delta_lim = L/500 to L/360
  L/360 = 6640/360 = 18.4 mm ; L/500 = 13.3 mm [recommended for operable glazing]
```

A standard 200x200 RC tie-beam is **wholly inadequate** (M_Rd ~15-20 kNm). Required:

Option A (preferred): RC inverted / concealed beam 250(w) x 500-550(h) C25/30, 4Ø16 bottom + 2Ø14 top, stirrups Ø8/100 at supports. Check: d=510mm, M_Rd ~95 kNm >73.9 OK. Deflection with cracked I_eff requires pre-camber 10mm.

Option B: Steel portal: 2x IPE 270 S355 composite or single IPE 320 concealed in ceiling + 200x200 RC columns at Axis-2 and Axis-3 with pad footings. Must design for thermal break at terrace junction.

Option C: Glulam GL24h 160 x 480, M_Rd = f_m,d * W = 14.7 MPa * (0.16*0.48^2/6) = 90.3 kNm OK, but fire R30 requires +20mm charring allowance -> use 180x520.

**Terrace roof:** 6.64m x ~3.39m [derived: 22.53 m2 / 6.64 m = 3.39 m projection]. Cannot span 6.64m with timber pergola alone without intermediate posts. Recommend 2No steel SHS 100x100 posts at Axis-A line (outer terrace edge) creating portal frame with South wall, or cantilevered rafters from Axis-B beam max 2.0m - therefore **3.39m projection requires propped structure**. Current plan shows side walls at Axis-2 and Axis-3 extending to Axis-A - these masonry fins are excellent: they act as shear cheeks and support terrace roof edge beams. Retain them as 250mm RC-confined masonry, do not demolish.

### 1.4 Lateral / Shear Resistance

Building aspect ratio L/W = 14.81 / 9.22 = 1.61 < 3.0 - rigid diaphragm behavior achievable with RC ring beam at wall plate.

Wind: q_p ~0.60-0.80 kN/m2. Base shear:

```
F_w,N-S = q * L * H_wall = 0.70 * 14.81 * 3.0 = 31.1 kN
F_w,E-W = 0.70 * 9.22 * 3.0 = 19.4 kN
```

Shear capacity provided by:
- N-S direction (weak): relies on Axis-1, Axis-2, Axis-3, Axis-4 cross-walls. Axis-2 and Axis-3 are perforated but retain >40% solid length. Adequate if RC tie-columns at all corners and T-junctions per Eurocode 8 / confined masonry rules: max wall spacing <7.5m. Here Grid 2-3 =6.64m <7.5m COMPLIANT, but at limit. Do not widen further.
- E-W direction (strong): North wall (D) almost solid, South wall (B) perforated at living room. Eccentricity between centre of mass and centre of rigidity will induce torsion. Mitigation: retain full-height masonry piers minimum 620mm wide each side of sliding doors at Axis-2 and Axis-3, reinforced with 4Ø14 tie-columns.

Seismic: Single storey, light roof, regular mass. If PGA >0.15g, mandatory RC horizontal tie-beams 200x200 at lintel + wall plate levels continuous around perimeter including terrace fins, vertical ties at all openings >1.5m.

**Structural Recommendations:**
1. Declare Axis-B Grid 2-3 lintel as TRANSFER ELEMENT - engineer-stamped calculation required.
2. Declare Axis-2 and Axis-3 interior walls as LOAD-BEARING SHEAR WALLS - no future demolition for open-concept merging.
3. Provide RC ring beam + tie-columns system; terrace fins tied to main house.
4. Foundation: continuous strips 600x800 under L1,L2,L3,T1-T4; thickened pad under terrace posts; differential settlement joint not needed if same soil.

---

## 2. LIFE SAFETY & IBC/IRC CODE COMPLIANCE AUDIT
Reference: IRC 2021 R310 Emergency Escape, R303 Light/Ventilation, R311 Means of Egress. IBC Ch.10.

### 2.1 Emergency Egress - Bedrooms [R310.2]

Requirement: Every sleeping room shall have one operable emergency escape opening: net clear area A_n >= 0.53 m2 (5.7 ft2, grade floor 0.46 m2), min clear width >= 0.51m, min clear height >= 0.61m, sill height <= 1.12m above floor.

| Room | Floor A | Exterior Window Observed | Assumed Clear Opening | Audit |
|------|---------|--------------------------|-----------------------|-------|
| Bedroom NW 13.11 m2 [Axis 1-2/D-C] | 13.11 | West window + North wall? Plan shows 1No west vertical slot | 1.50w x 1.50h casement, clear 1.34x1.38=1.85 m2 gross, net openable ~0.90 m2 | **LIKELY COMPLIANT** subject to sill <=1.12m. Recommend sill 0.60m + safety restrictor. Requires second verification: north facade appears blank - provide second light window for dual aspect. |
| Bedroom NE 13.84 m2 | 13.84 | North + East? Plan shows top edge? | Similar 1.50x1.50 | **LIKELY COMPLIANT**. Corner room - excellent two-direction egress potential. Ensure at least one meets full clear dimensions. |
| Bedroom E-mid 12.83 m2 | 12.83 | East window (right wall) | 1.20x1.50 | Net ~0.70 m2 **COMPLIANT** if side-hung. Sill detail critical. |
| Bedroom SE 13.37 m2 | 13.37 | East + South windows (corner) | 2No windows | **FULLY COMPLIANT + REDUNDANT** - best egress in house. |

**Finding:** All 4 bedrooms have direct exterior walls with punched windows. No bedroom relies solely on internal corridor. No basement. **Egress concept passes.** Deficiency: Drawings do not dimension sill heights, opening leaf type. Sliding windows typically provide only 50% clear - a 1.50m slider gives only 0.75m width x height - still passes if height >=0.70m, but must be specified as **egress-rated casement / tilt-turn with clear 0.53 m2**. All bedroom glazing within 0.60m of floor must be tempered safety glass [R308.4].

### 2.2 Natural Light & Ventilation [R303]

Code: Glazing area A_g >= 8% floor area. Openable ventilation A_v >= 4% floor area. Adjoining rooms considered separately unless cased opening >=8%.

Equation: `WFR = A_glass / A_floor >= 0.08` ; `OVR = A_openable / A_floor >= 0.04`

| Room | A_floor | Req. Light 8% | Req. Vent 4% | Estimated Provided | Status |
|------|---------|---------------|--------------|--------------------|--------|
| Bedroom 13.11 | 13.11 | 1.05 m2 | 0.52 m2 | Window 1.5x1.5=2.25 m2, openable 1.12 m2 | PASS 17.2% / 8.5% |
| Bedroom 13.84 | 13.84 | 1.11 m2 | 0.55 m2 | 2.25 m2 / 1.12 m2 | PASS 16.2% |
| Bedroom 12.83 | 12.83 | 1.03 m2 | 0.51 m2 | ~1.80 m2 / 0.90 m2 | PASS 14.0% |
| Bedroom 13.37 | 13.37 | 1.07 m2 | 0.53 m2 | 2 windows ~3.60 m2 / 1.80 m2 | PASS EXCELLENT 26.9% |
| Living-Kitchen 25.91 | 25.91 | 2.07 m2 | 1.04 m2 | South glazing ~6.0m wide x 2.1h =12.6 m2 + kitchen west? | PASS 48% - daylight powerhouse |
| Hallway 13.33 | 13.33 | 1.07 m2 | 0.53 m2 | West window ~1.5 m2? Plan shows west slot | MARGINAL PASS - verify |
| Corridor 6.25+10.46 | 16.71 | 1.34 m2 | 0.67 m2 | No direct exterior window - borrowed light via doors + north entry glazing | **TECHNICAL FAIL R303.1** - interior corridor without natural light permitted if artificial light provided per R303.1 Exception + mechanical ventilation. Acceptable under IRC but poor amenity. Recommend solar tube / borrowed transom from Living. |
| WC 3.93 / WC 5.64 | 9.57 total | 0.28 m2 each if required | mech vent permitted | No exterior window shown - small north high windows probable | COMPLIANT via mechanical exhaust 25 L/s intermittent per M1507. Provide humidity-sensor fans ducted to north facade. |

Overall Daylight: South living zone DF >5%, North bedrooms DF 2-3.5% - good balance, no dark habitable room except internal corridor.

### 2.3 Means of Egress Widths [R311]

- Main entrance: Hallway south door [Axis-B, Grid 1-2]. Required egress door min 0.81m wide x 2.03m high side-hinged. Plan shows ~0.90-1.00m swing - **COMPLIANT**.
- Corridor width: Required 0.91m (36") min clear. Estimated from area: Corridor 6.25 m2 length ~4.5m => width ~1.39m. East corridor 10.46 m2 includes lobby - width >1.20m. **COMPLIANT with margin for furniture**.
- Hallway 13.33 m2 width ~2.5m - generous, allows universal access turning circle 1.50m diameter. Excellent for aging-in-place.
- Secondary egress: Living sliding doors to terrace: clear width >1.60m double leaf - provides redundant escape path for living + kitchen + indirectly bedrooms via corridor (<15m travel). Travel distance from farthest bedroom (NE) to exterior: ~12m via corridor + hallway + south door - well under 25m single-family limit.
- Doors: Bedroom doors appear 0.80m - compliant for non-egress interior (min 0.71m). Recommend upgrade to 0.90m for accessibility.

**Life Safety Actions:** 1) Specify all bedroom windows as egress tilt-turn with net 0.53 m2 tags, sill 600-900mm. 2) Tempered glass at terrace doors + low windows. 3) Hardwired interconnected smoke/CO in each bedroom, corridor, living, furnace room. 4) Furnace room door 0.80m self-closing fire-rated 20-min separating combustion from corridor.

---

## 3. MEP & WET-WALL OPTIMIZATION

### 3.1 Centralized Wet-Core - Exemplary Design

Layout between Grid ~2-3, Axis D-C:

```
[Furnace 3.75] [Main WC 5.64 with tub+WC+bidet+sink]
[Guest WC 3.93 with shower+WC+sink] - back-to-back
```

All water, soil, vent fixtures contained within ~3.5m x 3.5m zone sharing two wet walls:

Wet Wall W1 (E-W): between Furnace/Guest WC and Corridor - carries sink drains, water manifold.
Wet Wall W2 (N-S): between Guest WC and Main WC - carries back-to-back WC + bidet + shower + tub wastes to single vertical soil stack.

Benefits quantified:
- Soil stack length: 1No Ø110mm UPVC stack serving 2x WC + 2x shower/tub + 3x basin + washing? Total DFU ~14-16, single stack adequate (max 24 DFU for 110mm at 1/4 slope).
- Hot water dead-leg: Furnace (boiler/water heater) adjacent to both bathrooms: longest hot run <4.0m. At Ø16mm PEX, volume V = πr²L = 3.14*0.008²*4.0 = 0.80 litres - **<3 litre limit, no recirculation required**, wait time <8 sec. Excellent energy/water score.
- Venting: Single Ø75mm vent through north roof slope serves both WCs - short, no offsets.
- Acoustic: Wet core buffered from bedrooms by corridors/wardrobes - no soil pipe in bedroom party wall. Guest WC wall to Bedroom NW must be acoustic double-board 2x12.5mm + 50mm mineral wool, Rw >=52dB.

Recommendation LOD 300: Model W2 as 150-200mm shaft wall with removable access panel, slope 2% for Ø50 branches, 1-2% for Ø110. Provide floor drain + waterproofing in both WCs, wall-hung WCs to ease cleaning.

### 3.2 HVAC - Furnace Hub 3.75 m2

Location is near geometric centroid of heating load:

Centroid of house ~ Axis 2.6, Axis C. Furnace at Axis ~2.3, Axis D - offset ~2.5m north of ideal, but optimal for flue to north exterior + gas/water entry + noise isolation.

Duct routing efficiency:

```
Max run: Furnace -> SE Bedroom 13.37 m2: ~7.5m east + 6.0m south = ~9.0m developed
         Furnace -> SW Hallway: ~5.0m west + 5.0m south = ~7.0m
         Furnace -> Living: ~3.5m south direct
```

All runs <10m - **low static pressure system viable**. Recommended: radial spider with insulated rectangular trunk 300x200 in corridor false ceiling (corridor width 1.3m allows 0.60m soffit), 6No Ø125-160 flexible branches to rooms. Returns: central corridor return grille 600x400 + door undercuts 15mm + transfer grilles above bedroom doors for pressure balance.

Heating load estimate: 122.42 m2 x ~60 W/m2 (moderate insulation, -12°C design) = ~7.3 kW + DHW 3kW => 12kW condensing boiler / 9kW heat pump adequate. Furnace room 3.75 m2 (approx 1.9x2.0m) fits wall-hung boiler + 200L cylinder + manifold + HRV unit 300 m3/h. Combustion air: direct concentric flue through north wall/roof; provide 150cm2 make-up vent. HRV fresh air intake north (clean), exhaust north - separation 1.5m min.

Electrical: Main panel in furnace room north wall, radial: 3x lighting, 5x socket, dedicated oven 32A, boiler 16A, HRV 10A. Sub