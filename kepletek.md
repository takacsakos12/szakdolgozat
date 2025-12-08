Általános RTP:

RTP = sum(nyeremények) / (megjátszott körök * tét)

$$
RTP = \frac{\sum \text{nyeremények}}{\text{megjátszott körök}    \cdot     \text{tét}}
$$

0. Általános jelölések

𝑡
t – egy körben felrakott tét (pl. 100 Ft)

𝑛
n – lejátszott körök száma

𝑊
𝑖
W
i
	​

 – az 
𝑖
i-edik kör bruttó visszanyert összeg (0, t, 2t, stb.)

𝑋
𝑖
X
i
	​

 – az 
𝑖
i-edik kör nettó nyeresége (pl. +100, -100)

Kapcsolat:

𝑋
𝑖
=
𝑊
𝑖
−
𝑡
X
i
	​

=W
i
	​

−t

Empirikus RTP:

𝑅
𝑇
𝑃
emp
(
𝑛
)
=
∑
𝑖
=
1
𝑛
𝑊
𝑖
𝑛
⋅
𝑡
RTP
emp
	​

(n)=
n⋅t
∑
i=1
n
	​

W
i
	​

	​

1. Nyerőgép (slot)
1.1 Elméleti RTP (matematikai számítás)

Legyenek a lehetséges kimenetelek:

𝑐
𝑗
c
j
	​

 – a 
𝑗
j-edik nyerő kombináció

𝑃
(
𝑐
𝑗
)
P(c
j
	​

) – annak valószínűsége

pay
(
𝑐
𝑗
)
pay(c
j
	​

) – kifizetés (bruttó)

Az elméleti RTP:

$$
RTP_{\text{slot, elméleti}} = \frac{1}{t} \sum_{j} P(c_j) \cdot \text{pay}(c_j)
$$


Ha a nyereményt nettóban kezeled (tétet levonod), akkor:

$$
\mathbb{E}[X] = \sum_j P(c_j) \cdot x_j
$$

$$
RTP = 1 + \frac{\mathbb{E}[X]}{t}
$$

1.2 Empirikus RTP szimulációval (1M vagy 10M pörgetés)
$$
RTP_{\text{emp}}(n) = \frac{\sum_{i=1}^{n} W_i}{n \cdot t}
$$


vagy nettóval:

$$
RTP_{\text{emp}}(n) = 1 + \frac{1}{n \cdot t} \sum_{i=1}^{n} X_i
$$

1.3 Volatilitás (nyeremények szórása)

Legyen 
𝑋
X a nettó nyereség egy pörgetésre:

$$
\mu = \mathbb{E}[X] = \sum_i p_i x_i
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


Ez a 
𝜎
σ lesz a „volatilitás” mutatód (akár leírhatod mint „szórás / tét”).

2. Rulett
2.1 Valószínűségek ellenőrzése

Például egy számra tett tét (straight bet, európai rulett):

$$
P(\text{találat}) = \frac{1}{37},
\quad
P(\text{nem találat}) = \frac{36}{37}
$$


Empirikus ellenőrzés szimulációval: ha 
𝐾
K a találatok száma 
𝑛
n körből:

$$
\hat{P}(\text{találat}) = \frac{K}{n}
$$

2.2 Ház előnye

Straight betnél:

nyeréskor +35 tét (nettó)

vesztéskor -1 tét

$$
\mathbb{E}[X] = \frac{1}{37} \cdot 35 + \frac{36}{37} \cdot (-1)
= -\frac{1}{37}
$$

$$
RTP = 1 + \frac{\mathbb{E}[X]}{t} = 1 - \frac{1}{37} \approx 0{,}9730
$$

$$
\text{House Edge} = 1 - RTP = \frac{1}{37} \approx 0{,}0270
$$


Általános formában (bármilyen tétfajtára):

$$
\mathbb{E}[X] = \sum_j p_j \cdot x_j
$$

$$
\text{House Edge} = -\frac{\mathbb{E}[X]}{t}
$$

2.3 Stratégiák elemzése (pl. Martingale)

Itt a lényeg, hogy a stratégiával kapott átlagos profit:

$$
\bar{X}_n = \frac{1}{n} \sum_{i=1}^{n} X_i
$$


és az ehhez tartozó empirikus RTP:

$$
RTP_{\text{emp, stratégia}}(n)
= 1 + \frac{1}{n \cdot t_{\text{átlag}}} \sum_{i=1}^{n} X_i
$$


(itt döntheted el, hogyan kezeled a változó téteket, pl. átlag tét vagy össztétet használva a nevezőben).

3. Blackjack
3.1 Alap valószínűségek

Legyen egy leosztás kimenete:

Játékos nyer: valószínűsége 
𝑃
𝑊
P
W
	​

, nyeremény 
+
𝑤
+w (tét vagy blackjacknél 1,5 tét)

Játékos veszít: valószínűsége 
𝑃
𝐿
P
L
	​

, nyeremény 
−
𝑡
−t

Döntetlen (push): valószínűsége 
𝑃
𝑃
P
P
	​

, nyeremény 
0
0

$$
P_W + P_L + P_P = 1
$$


A várható érték:

$$
\mathbb{E}[X] = P_W \cdot w + P_L \cdot (-t) + P_P \cdot 0
$$

$$
RTP = 1 + \frac{\mathbb{E}[X]}{t}
$$


A 
𝑃
𝑊
,
𝑃
𝐿
,
𝑃
𝑃
P
W
	​

,P
L
	​

,P
P
	​

 értékeket szimulációval becsülöd (random játékos, basic stratégia, stb.).

3.2 Ház előnye blackjackben
$$
\text{House Edge} = -\frac{\mathbb{E}[X]}{t}
$$


különböző stratégia esetén más és más lesz 
𝐸
[
𝑋
]
E[X], tehát a house edge is.

3.3 Stratégiák vizsgálata

Pl.:

𝐸
[
𝑋
random
]
E[X
random
	​

] – ha a játékos random dönt

𝐸
[
𝑋
basic
]
E[X
basic
	​

] – ha basic stratégia szerint dönt

$$
RTP_{\text{random}} = 1 + \frac{\mathbb{E}[X_{\text{random}}]}{t}
$$

$$
RTP_{\text{basic}} = 1 + \frac{\mathbb{E}[X_{\text{basic}}]}{t}
$$


és összehasonlítod őket.

4. Baccarat
4.1 Empirikus RTP 1M leosztásból

Ha mondjuk Player tétet nézel:

𝑋
𝑖
X
i
	​

 – az 
𝑖
i-edik leosztás nettó nyeresége Player tét esetén

$$
RTP_{\text{Player, emp}}(n) = 1 + \frac{1}{n \cdot t} \sum_{i=1}^{n} X_i
$$


Ugyanez Banker és Tie tétre is.

4.2 Elméleti RTP

Player tétre:

Player nyer: kifizetés +t

Banker nyer: kifizetés -t

Tie: tét visszajár (0)

$$
\mathbb{E}[X_{\text{Player}}] =
P_{PW} \cdot t +
P_{PL} \cdot (-t) +
P_{PT} \cdot 0
$$

$$
RTP_{\text{Player}} = 1 + \frac{\mathbb{E}[X_{\text{Player}}]}{t}
$$


Banker tétre (jutalékkal, pl. 5%):

$$
\mathbb{E}[X_{\text{Banker}}] =
P_{BW} \cdot 0{,}95 t +
P_{BL} \cdot (-t) +
P_{BT} \cdot 0
$$

$$
RTP_{\text{Banker}} = 1 + \frac{\mathbb{E}[X_{\text{Banker}}]}{t}
$$


Tie tétre:

$$
\mathbb{E}[X_{\text{Tie}}] =
P_{TW} \cdot k t +
P_{TL} \cdot (-t)
$$

$$
RTP_{\text{Tie}} = 1 + \frac{\mathbb{E}[X_{\text{Tie}}]}{t}
$$


ahol 
𝑘
k a Tie kifizetési szorzója (pl. 8).

5. Konvergencia – minden játékra

A konvergenciát gyakorlatilag minden játékra ugyanazzal a formával tudod leírni:

Ha 
𝑅
𝑇
𝑃
emp
(
𝑛
)
RTP
emp
	​

(n) a szimulált RTP 
𝑛
n játék után,
és 
𝑅
𝑇
𝑃
elm
e
ˊ
leti
RTP
elm
e
ˊ
leti
	​

 a kiszámolt elméleti RTP, akkor:

$$
RTP_{\text{emp}}(n) = 1 + \frac{1}{n \cdot t} \sum_{i=1}^{n} X_i
$$

$$
\lim_{n \to \infty} RTP_{\text{emp}}(n) = RTP_{\text{elméleti}}
$$


Ha akarod, odarakhatod mellé:

$$
SE = \frac{\sigma}{\sqrt{n}}
$$


mint a konfidencia / „ingadozás” nagyságát.