# Design tokens (computed from the live site)

Measured 2026-10-27 from 19 template pages at 1440 px and 4 at 390 px. Raw data: `legacy/assets/design-tokens.json`; the real stylesheets, fonts and theme images are in `legacy/assets/{css,fonts,images}` (manifest.csv). Counts = number of text/box elements using the value, summed across the template pages (sitewide chrome such as the side panel excluded). Use as reference for the Astro rebuild — Theratio is a purchased theme: check its licence before copying files.

## Text colours

| Colour | Uses |
|---|---|
| `#1a1a1a` | 430 |
| `#ffffff` | 265 |
| `#555555` | 195 |
| `#a3a3a3` | 178 |
| `#9f9e9e` | 103 |
| `#818a91` | 72 |
| `#7b7b7b` | 34 |
| `#bfbfbf` | 29 |
| `#d0cfcf` | 17 |
| `#7d7d7d` | 17 |
| `#54595f` | 13 |
| `#313131` | 8 |
| `#aaa8a3` | 5 |
| `#ead5a1` | 2 |

## Background colours

| Colour | Uses |
|---|---|
| `#ffffff` | 173 |
| `#1a1a1a` | 119 |
| `#000000 (α0.1)` | 49 |
| `#f4f4f4` | 19 |
| `#f9f9f9` | 11 |
| `#efefef` | 8 |
| `#101012` | 1 |
| `#f5f3ef` | 1 |
| `#c8a96b` | 1 |
| `#cccccc` | 1 |

## Fonts (first family of computed font-family)

| Family | Uses |
|---|---|
| Titillium Web | 656 |
| -apple-system | 335 |
| Raleway | 153 |
| Josefin Sans | 103 |
| Arial | 99 |
| Roboto | 17 |
| Inter | 14 |
| Montserrat | 1 |

Font faces actually loaded: `Flaticon|normal|normal`, `Font Awesome 5 Brands|400|normal`, `Font Awesome 5 Brands|normal|normal`, `Font Awesome 5 Free|400|normal`, `Font Awesome 5 Free|900|normal`, `Josefin Sans|400|normal`, `Josefin Sans|500|normal`, `Josefin Sans|600|normal`, `Montserrat|400|normal`, `Raleway|400|italic`, `Raleway|400|normal`, `Raleway|500|normal`, `Roboto|400|normal`, `Roboto|500|normal`, `Roboto|600|normal`, `Roboto|700|normal`, `Titillium Web|300|normal`, `Titillium Web|400|normal`, `Titillium Web|600|italic`, `Titillium Web|600|normal`, `eicons|400|normal`.

## Type scale — family | size px | weight | line-height | letter-spacing | transform | style

| Combination | Uses |
|---|---|
| -apple-system · 16 · 400 · 30 · normal · none · normal | 178 |
| Titillium Web · 14 · 600 · 26.3 · normal · uppercase · normal | 153 |
| Raleway · 16 · 400 · 30 · normal · none · normal | 93 |
| -apple-system · 16 · 400 · 16 · normal · none · normal | 72 |
| Josefin Sans · 14 · 400 · 26.3 · normal · uppercase · normal | 58 |
| Titillium Web · 13 · 600 · 14.3 · 0.6 · uppercase · normal | 52 |
| Arial · 16 · 400 · 18 · normal · none · normal | 51 |
| Titillium Web · 20 · 400 · 20 · normal · none · normal | 45 |
| Titillium Web · 14 · 500 · 26.3 · normal · uppercase · normal | 41 |
| Titillium Web · 30 · 400 · 42 · normal · none · normal | 40 |
| Titillium Web · 13 · 600 · 13 · 0.5 · uppercase · normal | 40 |
| Titillium Web · 16 · 600 · 18 · normal · none · normal | 37 |
| -apple-system · 15 · 400 · 28.1 · normal · none · normal | 34 |
| Raleway · 14 · 400 · 26.3 · normal · none · normal | 34 |
| Titillium Web · 24 · 400 · 33.6 · normal · none · normal | 32 |
| Titillium Web · 13 · 600 · 18.6 · 0.5 · uppercase · normal | 30 |
| Titillium Web · 22 · 400 · 30.8 · normal · none · normal | 26 |
| Titillium Web · 18 · 400 · 24 · normal · none · normal | 26 |
| Josefin Sans · 12 · 400 · 12 · normal · uppercase · normal | 26 |
| Arial · 16 · 400 · 30 · normal · none · normal | 25 |
| Arial · 16 · 400 · 24 · normal · none · normal | 23 |
| Titillium Web · 30 · 300 · 42 · normal · none · normal | 22 |
| -apple-system · 14 · 400 · 26.3 · normal · none · normal | 18 |
| Titillium Web · 18 · 300 · 48 · normal · none · normal | 17 |

## Element samples (first template page where the element exists; mobile = 390 px)

| Element | Family | Desktop size / line-height | Weight | Colour | Mobile size / line-height |
|---|---|---|---|---|---|
| body | -apple-system | 16px / 30px | 400 | #555555 | 16px / 30px |
| h1 | Titillium Web | 30px / 42px | 300 | #ffffff | 32px / 44.8px |
| h2 | Titillium Web | 30px / 48px | 400 | #1a1a1a | 30px / 38px |
| h3 | Titillium Web | 36px / 50.4px | 400 | #1a1a1a | 36px / 50.4px |
| h4 | Titillium Web | 30px / 30px | 400 | #1a1a1a | 30px / 30px |
| h5 | Titillium Web | 24px / 36px | 400 | #1a1a1a | 24px / 36px |
| h6 | Titillium Web | 22px / 30.8px | 400 | #ffffff | 22px / 30.8px |
| p | -apple-system | 16px / 30px | 400 | #555555 | 16px / 30px |
| a_body | -apple-system | 16px / 30px | 400 | #1a1a1a | 16px / 30px |
| nav_link | Titillium Web | 14px / 26.25px | 600 | #1a1a1a | — |
| footer_link | -apple-system | 16px / 30px | 400 | #1a1a1a | 16px / 30px |

### Primary button (a.octf-btn.octf-btn-dark)

```json
{
 "width": 206,
 "height": 57,
 "fontFamily": "\"Titillium Web\", sans-serif",
 "fontSize": "13px",
 "fontWeight": "600",
 "letterSpacing": "0.5px",
 "textTransform": "uppercase",
 "color": "rgb(255, 255, 255)",
 "backgroundColor": "rgb(26, 26, 26)",
 "borderTopWidth": "1px",
 "borderTopStyle": "solid",
 "borderTopColor": "rgb(26, 26, 26)",
 "borderRadius": "0px",
 "paddingTop": "18px",
 "paddingRight": "41px",
 "paddingBottom": "18px",
 "paddingLeft": "41px",
 "boxShadow": "none",
 "transition": "0.3s linear"
}
```

### Secondary button (a.octf-btn)

```json
{
 "width": 139,
 "height": 42,
 "fontFamily": "\"Titillium Web\"",
 "fontSize": "9px",
 "fontWeight": "600",
 "letterSpacing": "normal",
 "textTransform": "uppercase",
 "color": "rgb(255, 255, 255)",
 "backgroundColor": "rgb(26, 26, 26)",
 "borderTopWidth": "1px",
 "borderTopStyle": "solid",
 "borderTopColor": "rgba(0, 0, 0, 0)",
 "borderRadius": "0px",
 "paddingTop": "11px",
 "paddingRight": "28px",
 "paddingBottom": "11px",
 "paddingLeft": "28px",
 "boxShadow": "none",
 "transition": "none"
}
```

### header

```json
{
 "selector": "#site-header, header",
 "text": "主頁\n關於我們\nSMP 治療\n\n\t男士專用脫髮療程\n\t什麼是SMP？\n\t植髮與疤",
 "width": 1440,
 "height": 100,
 "backgroundColor": "rgba(0, 0, 0, 0)",
 "position": "absolute",
 "paddingTop": "0px",
 "paddingBottom": "0px",
 "boxShadow": "none",
 "borderBottom": "0px none rgb(85, 85, 85)"
}
```

### footer

```json
{
 "selector": "#site-footer, footer",
 "text": "HIS 香港紋髮 SMP 中心由英國受訓、2009年起全職從業的 Jonatha",
 "width": 1440,
 "height": 886,
 "backgroundColor": "rgba(0, 0, 0, 0)",
 "color": "rgb(85, 85, 85)",
 "paddingTop": "0px",
 "paddingBottom": "0px",
 "fontSize": "16px"
}
```

### input

```json
{
 "selector": "input[type=text], input[type=email], textarea, input[type=search]",
 "text": "",
 "width": 263,
 "height": "46px",
 "fontFamily": "Raleway, sans-serif",
 "fontSize": "14px",
 "color": "rgb(177, 176, 176)",
 "backgroundColor": "rgba(0, 0, 0, 0)",
 "borderTopWidth": "0px",
 "borderTopStyle": "none",
 "borderTopColor": "rgba(255, 255, 255, 0.1)",
 "borderRadius": "0px",
 "paddingTop": "8px",
 "paddingLeft": "10px"
}
```

### card

```json
{
 "selector": ".post-box, article",
 "text": "資訊\t\t\t\t\t\t\t        \t\t\t\t\t       \n\t\t\t\t\t\t\t   ",
 "width": 357,
 "height": 579,
 "backgroundColor": "rgba(0, 0, 0, 0)",
 "borderRadius": "0px",
 "boxShadow": "none",
 "paddingTop": "0px",
 "paddingLeft": "0px"
}
```

## Radii, shadows, borders (most used)

| Radius | Uses |
|---|---|
| 50% | 113 |
| 5px | 17 |
| 999px | 6 |
| 50px | 4 |
| 1000px | 1 |
| 24px | 1 |

| Box-shadow | Uses |
|---|---|
| `rgba(51, 51, 51, 0.5) 0px 0px 12px 0px` | 1 |
| `rgba(0, 0, 0, 0.4) 0px 24px 80px 0px` | 1 |

| Border | Uses |
|---|---|
| `#e0e0e0` | 103 |
| `#444444` | 68 |
| `#1a1a1a` | 27 |
| `#555555` | 17 |
| `#313131` | 17 |
| `#555555` | 11 |

## Layout widths (home, desktop)

```json
{
 "viewport": [
  1440,
  900
 ],
 "doc_width": 1440,
 ".elementor-section.elementor-section-boxed > .elementor-container": {
  "width": 310,
  "maxWidth": "1200px",
  "paddingLeft": "15px"
 },
 ".site-content": {
  "width": 1440,
  "maxWidth": "none",
  "paddingLeft": "0px"
 },
 "#site-header .container, #site-header > div": {
  "width": 1440,
  "maxWidth": "none",
  "paddingLeft": "0px"
 }
}
```

## CSS custom properties found (Elementor kit / :root)

```
--wp--preset--font-size--normal: 16px
--wp--preset--font-size--huge: 42px
--wp--preset--color--black: #000000
--wp--preset--color--cyan-bluish-gray: #abb8c3
--wp--preset--color--white: #ffffff
--wp--preset--color--pale-pink: #f78da7
--wp--preset--color--vivid-red: #cf2e2e
--wp--preset--color--luminous-vivid-orange: #ff6900
--wp--preset--color--luminous-vivid-amber: #fcb900
--wp--preset--color--light-green-cyan: #7bdcb5
--wp--preset--color--vivid-green-cyan: #00d084
--wp--preset--color--pale-cyan-blue: #8ed1fc
--wp--preset--color--vivid-cyan-blue: #0693e3
--wp--preset--color--vivid-purple: #9b51e0
--wp--preset--gradient--vivid-cyan-blue-to-vivid-purple: linear-gradient(135deg,rgba(6,147,227,1) 0%,rgb(155,81,224) 100%)
--wp--preset--gradient--light-green-cyan-to-vivid-green-cyan: linear-gradient(135deg,rgb(122,220,180) 0%,rgb(0,208,130) 100%)
--wp--preset--gradient--luminous-vivid-amber-to-luminous-vivid-orange: linear-gradient(135deg,rgba(252,185,0,1) 0%,rgba(255,105,0,1) 100%)
--wp--preset--gradient--luminous-vivid-orange-to-vivid-red: linear-gradient(135deg,rgba(255,105,0,1) 0%,rgb(207,46,46) 100%)
--wp--preset--gradient--very-light-gray-to-cyan-bluish-gray: linear-gradient(135deg,rgb(238,238,238) 0%,rgb(169,184,195) 100%)
--wp--preset--gradient--cool-to-warm-spectrum: linear-gradient(135deg,rgb(74,234,220) 0%,rgb(151,120,209) 20%,rgb(207,42,186) 40%,rgb(238,44,130) 60%,rgb(251,105,98) 80%,rgb(254,248,76) 100%)
--wp--preset--gradient--blush-light-purple: linear-gradient(135deg,rgb(255,206,236) 0%,rgb(152,150,240) 100%)
--wp--preset--gradient--blush-bordeaux: linear-gradient(135deg,rgb(254,205,165) 0%,rgb(254,45,45) 50%,rgb(107,0,62) 100%)
--wp--preset--gradient--luminous-dusk: linear-gradient(135deg,rgb(255,203,112) 0%,rgb(199,81,192) 50%,rgb(65,88,208) 100%)
--wp--preset--gradient--pale-ocean: linear-gradient(135deg,rgb(255,245,203) 0%,rgb(182,227,212) 50%,rgb(51,167,181) 100%)
--wp--preset--gradient--electric-grass: linear-gradient(135deg,rgb(202,248,128) 0%,rgb(113,206,126) 100%)
--wp--preset--gradient--midnight: linear-gradient(135deg,rgb(2,3,129) 0%,rgb(40,116,252) 100%)
--wp--preset--duotone--dark-grayscale: url('#wp-duotone-dark-grayscale')
--wp--preset--duotone--grayscale: url('#wp-duotone-grayscale')
--wp--preset--duotone--purple-yellow: url('#wp-duotone-purple-yellow')
--wp--preset--duotone--blue-red: url('#wp-duotone-blue-red')
--wp--preset--duotone--midnight: url('#wp-duotone-midnight')
--wp--preset--duotone--magenta-yellow: url('#wp-duotone-magenta-yellow')
--wp--preset--duotone--purple-green: url('#wp-duotone-purple-green')
--wp--preset--duotone--blue-orange: url('#wp-duotone-blue-orange')
--wp--preset--font-size--small: 13px
--wp--preset--font-size--medium: 20px
--wp--preset--font-size--large: 36px
--wp--preset--font-size--x-large: 42px
--wp--preset--spacing--20: 0.44rem
--wp--preset--spacing--30: 0.67rem
--wp--preset--spacing--40: 1rem
--wp--preset--spacing--50: 1.5rem
--wp--preset--spacing--60: 2.25rem
--wp--preset--spacing--70: 3.38rem
--wp--preset--spacing--80: 5.06rem
--swiper-theme-color: #007aff
--swiper-navigation-size: 44px
--joinchat-ico: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23fff' d='M3.516 3.516c4.686-4.686 12.284-4.686 16.97 0 4.686 4.686 4.686 12.283 0 16.97a12.004 12.004 0 0 1-13.754 2.299l-5.814.735a.392.392 0 0 1-.438-.44l.748-5.788A12.002 12.002 0 0 1 3.517 3.517zm3.61 17.043.3.158a9.846 9.846 0 0 0 11.534-1.758c3.843-3.843 3.843-10.074 0-13.918-3.843-3.843-10.075-3.843-13.918 0a9.846 9.846 0 0 0-1.747 11.554l.16.303-.51 3.942a.196.196 0 0 0 .219.22l3.961-.501zm6.534-7.003-.933 1.164a9.843 9.843 0 0 1-3.497-3.495l1.166-.933a.792.792 0 0 0 .23-.94L9.561 6.96a.793.793 0 0 0-.924-.445 1291.6 1291.6 0 0 0-2.023.524.797.797 0 0 0-.588.88 11.754 11.754 0 0 0 10.005 10.005.797.797 0 0 0 .88-.587l.525-2.023a.793.793 0 0 0-.445-.923L14.6 13.327a.792.792 0 0 0-.94.23z'/%3E%3C/svg%3E")
--joinchat-font: -apple-system,blinkmacsystemfont,"Segoe UI",roboto,oxygen-sans,ubuntu,cantarell,"Helvetica Neue",sans-serif
--page-title-display: block
--e-global-color-primary: #6EC1E4
--e-global-color-secondary: #54595F
--e-global-color-text: #7A7A7A
--e-global-color-accent: #61CE70
--e-global-color-3c08dcd: #0000001A
--e-global-color-8974abb: #1A1A1A
--e-global-color-5efeeab: #FFFFFF
--e-global-color-1108c2c: #FEC427
--e-global-color-c390858: #313131
--e-global-typography-primary-font-family: "Roboto"
--e-global-typography-primary-font-weight: 600
--e-global-typography-secondary-font-family: "Roboto Slab"
--e-global-typography-secondary-font-weight: 400
--e-global-typography-text-font-family: "Roboto"
--e-global-typography-text-font-weight: 400
--e-global-typography-accent-font-family: "Roboto"
--e-global-typography-accent-font-weight: 500
--bg: #09090a
--panel: #141416
--panel2: #1b1b1e
--line: #303034
--text: #f5f3ef
--muted: #aaa8a3
--gold: #c8a96b
--gold2: #ead5a1
--white: #fff
--green: #25d366
--shadow: 0 24px 80px rgba(0,0,0,.4)
```

## Media-query breakpoints used in the stylesheets (count of rules)

| Query | Rules |
|---|---|
| max-width:1024px | 58 |
| max-width:767px | 44 |
| min-width:768px | 26 |
| min-width:1025px | 12 |
| max-width:600px | 11 |
| min-width:600px | 7 |
| min-width:782px | 6 |
| max-width:479px | 5 |
| min-width:992px | 5 |
| min-width:1230px | 4 |
| max-width:991px | 4 |
| max-width:480px | 3 |
| min-width:1024px | 3 |
| max-width:782px | 3 |
| max-width:1199px | 2 |
| max-width:768px | 2 |
