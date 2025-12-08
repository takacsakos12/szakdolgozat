# Statisztikai vizsgálatok

Ebben a fejezetben definiálom az RTP-t, a várható értéket, a ház előnyt és a volatilitást,
valamint azokat a jelöléseket, amelyeket a kaszinójátékok statisztikai elemzésénél használok.

---

# Általános jelölések

- \( t \): egy körben felrakott tét
- \( n \): lejátszott körök száma
- \( W_i \): az \(i\)-edik körben visszanyert összeg (bruttó nyeremény)
- \( X_i \): az \(i\)-edik kör nettó nyeresége ( \(X_i = W_i - t\) )
- \( p_i \): az \(i\)-edik kimenetel valószínűsége
- \( x_i \): az \(i\)-edik kimenetelhez tartozó nettó nyereség
- \( \sigma \): szórás
- \( \mu \): várható érték (átlagos nyereség)

---

# Nyerőgép (Slot)

## Elméleti RTP
$$
RTP_{\text{elmeleti}} = \frac{1}{t} \sum_{j} P(c_j) \cdot \text{pay}(c_j)
$$

Magyarázat:
- \( c_j \): a \(j\)-edik nyerő kombináció
- \( P(c_j) \): a kombináció előfordulásának valószínűsége
- \( \text{pay}(c_j) \): a kombináció kifizetése
- \( t \): a feltett tét

---

## Empirikus RTP (szimuláció)
$$
RTP_{\text{emp}}(n) = \frac{\sum_{i=1}^{n} W_i}{n \cdot t}
$$

Magyarázat:
- \( W_i \): az \(i\)-edik pörgetés bruttó visszanyert összege
- \( n \): pörgetések száma

---

## Volatilitás (szórás)
A volatilitás azt mutatja meg, mennyire ingadoznak a nyeremények.

Várható érték:
$$
\mu = \sum_i p_i x_i
$$

Két négyzetre emelt érték várhatója:
$$
\mathbb{E}[X^2] = \sum_i p_i x_i^2
$$

Variancia:
$$
\mathrm{Var}(X) = \mathbb{E}[X^2] - \mu^2
$$

Szórás:
$$
\sigma = \sqrt{\mathrm{Var}(X)}
$$

Magyarázat:
- \( x_i \): nettó nyereség egy kimenetel esetén
- \( p_i \): annak valószínűsége

---

# Rulett

## Valószínűségek ellenőrzése (szimulációval)
$$
\hat{P}(\text{találat}) = \frac{K}{n}
$$

Magyarázat:
- \( K \): találatok száma
- \( n \): összes pörgetés száma

---

## Ház előnye

Általános várható érték:
$$
\mathbb{E}[X] = \sum_j p_j x_j
$$

RTP:
$$
RTP = 1 + \frac{\mathbb{E}[X]}{t}
$$

Ház előnye:
$$
\text{House Edge} = 1 - RTP
$$

Magyarázat:
- \( x_j \): nettó nyereség tétfajtánként
- \( p_j \): annak valószínűsége

---

## Straight bet példa (egy számra fogadás)
$$
\mathbb{E}[X] =
\frac{1}{37} \cdot 35 + \frac{36}{37}(-1)
$$

Magyarázat:
- Találat valószínűsége: \( \frac{1}{37} \)
- Kifizetés: 35-szörös nettó nyereség
- Veszítés valószínűsége: \( \frac{36}{37} \)
- Veszteség: −1 tét

---

# Blackjack

## Alap valószínűségek
$$
P_W + P_L + P_P = 1
$$

Magyarázat:
- \( P_W \): játékos nyerésének valószínűsége
- \( P_L \): játékos vesztésének valószínűsége
- \( P_P \): döntetlen (push)

---

## Várható érték és RTP
$$
\mathbb{E}[X] = P_W \cdot w + P_L \cdot (-t)
$$
$$
RTP = 1 + \frac{\mathbb{E}[X]}{t}
$$

Magyarázat:
- \( w \): játékos által nyert nettó összeg (pl. blackjacknél 1.5 tét)
- \( t \): feltett tét

---

## Ház előnye
$$
\text{House Edge} = -\frac{\mathbb{E}[X]}{t}
$$

---

# Baccarat

## Empirikus RTP
$$
RTP_{\text{emp}}(n) =
1 + \frac{1}{n \cdot t}
\sum_{i=1}^{n} X_i
$$

Magyarázat:
- \( X_i \): nettó nyereség az \(i\)-edik leosztásban
- \( n \): leosztások száma

---

## Player tét
$$
\mathbb{E}[X_{\text{Player}}]
= P_{PW} \cdot t
+ P_{PL} \cdot (-t)
$$

## Banker tét (5% jutalék)
$$
\mathbb{E}[X_{\text{Banker}}]
= P_{BW} \cdot 0.95t
+ P_{BL} \cdot (-t)
$$

## Tie tét
$$
\mathbb{E}[X_{\text{Tie}}]
= P_{TW} \cdot kt
+ P_{TL} \cdot (-t)
$$

Magyarázat:
- \( P_{PW}, P_{BW}, P_{TW} \): Player / Banker / Tie nyerési valószínűsége
- \( k \): Tie kifizetési szorzó (pl. 8)

---

# Konvergencia minden játékhoz

Empirikus RTP:
$$
RTP_{\text{emp}}(n)
= 1 + \frac{1}{n \cdot t} \sum_{i=1}^{n} X_i
$$

Konvergencia (nagy számok törvénye):
$$
\lim_{n \to \infty} RTP_{\text{emp}}(n)
= RTP_{\text{elmeleti}}
$$

Standard error:
$$
SE = \frac{\sigma}{\sqrt{n}}
$$

Magyarázat:
- Minél több szimulációt futtatsz, annál kisebb az ingadozás.
