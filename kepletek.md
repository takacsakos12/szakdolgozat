# Statisztikai vizsgálatok

## Nyerőgép

### Elméleti RTP
$$
RTP_{\text{elmeleti}} = \frac{1}{t} \sum_{j} P(c_j) \cdot \text{pay}(c_j)
$$

### Empirikus RTP
$$
RTP_{\text{emp}}(n) = \frac{\sum_{i=1}^{n} W_i}{n \cdot t}
$$

### Volatilitás
$$
\mu = \sum_i p_i x_i
$$

$$
\mathbb{E}[X^2] = \sum_i p_i x_i^2
$$

$$
\mathrm{Var}(X) = \mathbb{E}[X^2] - \mu^2
$$

$$
\sigma = \sqrt{\mathrm{Var}(X)}
$$


## Rulett

### Valószínűségek ellenőrzése
$$
\hat{P}(\text{találat}) = \frac{K}{n}
$$

### Ház előnye
$$
\mathbb{E}[X] =
\sum_j p_j x_j
$$

$$
RTP = 1 + \frac{\mathbb{E}[X]}{t}
$$

$$
\text{House Edge} = 1 - RTP
$$

### Straight bet példa (európai rulett)
$$
\mathbb{E}[X] = \frac{1}{37} \cdot 35 + \frac{36}{37}(-1)
$$


## Blackjack

### Alap valószínűségek
$$
P_W + P_L + P_P = 1
$$

### Várható érték és RTP
$$
\mathbb{E}[X] = P_W \cdot w + P_L \cdot (-t)
$$

$$
RTP = 1 + \frac{\mathbb{E}[X]}{t}
$$

### Ház előnye
$$
\text{House Edge} = -\frac{\mathbb{E}[X]}{t}
$$


## Baccarat

### Empirikus RTP
$$
RTP_{\text{emp}}(n) = 1 + \frac{1}{n \cdot t} \sum_{i=1}^{n} X_i
$$

### Player tét
$$
\mathbb{E}[X_{\text{Player}}]
= P_{PW} \cdot t
+ P_{PL} \cdot (-t)
$$

### Banker tét (5% jutalékkal)
$$
\mathbb{E}[X_{\text{Banker}}]
= P_{BW} \cdot 0.95t
+ P_{BL} \cdot (-t)
$$

### Tie tét
$$
\mathbb{E}[X_{\text{Tie}}]
= P_{TW} \cdot k t
+ P_{TL} \cdot (-t)
$$


## Konvergencia minden játékhoz
$$
RTP_{\text{emp}}(n)
= 1 + \frac{1}{n \cdot t} \sum_{i=1}^{n} X_i
$$

$$
\lim_{n \to \infty} RTP_{\text{emp}}(n)
= RTP_{\text{elmeleti}}
$$

$$
SE = \frac{\sigma}{\sqrt{n}}
$$
