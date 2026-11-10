# Course map: foundational STEM courses and open sources

Twelve lower-division courses, with the open textbooks and open courseware that cover them and the Agentuto
instruments that fit. Use it to pick the next course or module and its anchors (Constitution Art. 1.6, 6.4).
Shipped means the course is in `src/courses/courses.ts`; proposed means it is not built.

**Licences.** Equations, laws and published numerical answers are facts: cite the source and problem number.
Only CC BY, CC0 or MIT-licensed text may be adapted into this MIT-licensed repo, with attribution. Everything else
(CC BY-NC-SA such as MIT OCW, NC, ND, free PDFs, lecture videos) is linked, never copied. OpenStax licences differ
by book and edition: *University Physics*, *Calculus* and *Psychology 2e* are CC BY-NC-SA 4.0 (OpenStax catalogue,
checked 2026-11-09). Check a source's own licence page before adapting anything; labels below were checked on
2026-11-08 except where marked unverified.

| Course | Tracks | Status | Agentuto instruments |
|---|---|---|---|
| [18.03 Differential Equations & Dynamical Systems](#1803-differential-equations--dynamical-systems) | CS, PHYS, MATH, EE | Shipped | `harmonic-oscillator`, `rc-rl-circuits`, `lorenz-attractor` |
| [8.01 Classical Mechanics](#801-classical-mechanics) | PHYS, MATH, EE, CS | Shipped | `projectile-drag`, `conservation-momentum`, `kepler-orbits` |
| [8.02 Electricity & Magnetism](#802-electricity--magnetism) | PHYS, EE, MATH | Shipped | `lorentz-force`, `faraday-induction`, `gauss-flux`, `lcr-circuit`, `rc-rl-circuits` |
| [8.03 Vibrations, Waves & Optics](#803-vibrations-waves--optics) | PHYS, EE, MATH | Shipped | `standing-waves`, `doppler-shift`, `wave-optics` |
| [8.04 Quantum Physics I](#804-quantum-physics-i) | PHYS, EE, CS, MATH | Shipped | `photoelectric-effect`, `quantum-tunneling` |
| [8.044 Statistical Physics & Thermodynamics](#8044-statistical-physics--thermodynamics) | PHYS, EE, STAT, CS | Shipped | `maxwell-boltzmann`, `carnot-cycle` |
| [9.00 Introduction to Psychology](#900-introduction-to-psychology) | PSYCH, CS, STAT, NLP | Shipped | `signal-detection` |
| [18.01 / 18.02 Single & Multivariable Calculus](#1801--1802-single--multivariable-calculus) | CS, NLP, PHYS, MATH, STAT, EE | Proposed | `gauss-flux`, `faraday-induction`, `projectile-drag`, `kepler-orbits` |
| [18.06 Linear Algebra & Matrix Methods](#1806-linear-algebra--matrix-methods) | CS, NLP, PHYS, MATH, STAT, EE | Proposed | `standing-waves`, `harmonic-oscillator` |
| [18.05 / 6.041 Probability, Random Variables & Bayesian Inference](#1805--6041-probability-random-variables--bayesian-inference) | CS, NLP, PHYS, MATH, STAT, EE | Proposed | `maxwell-boltzmann`, `quantum-tunneling` |
| [6.042J / CS70 Discrete Mathematics, Information & Markov Chains](#6042j--cs70-discrete-mathematics-information--markov-chains) | CS, NLP, MATH, STAT | Proposed | `maxwell-boltzmann` |
| [6.002 / 6.003 Circuits, Signals & Systems (Fourier / Laplace)](#6002--6003-circuits-signals--systems-fourier--laplace) | EE, PHYS, CS, NLP, MATH | Proposed | `rc-rl-circuits`, `lcr-circuit`, `standing-waves`, `doppler-shift` |
| [6.036 / CS224N-Prep Optimization, Numerical Methods & Statistical Learning](#6036--cs224n-prep-optimization-numerical-methods--statistical-learning) | CS, NLP, STAT, MATH, EE | Proposed | none yet |

## 18.03 Differential Equations & Dynamical Systems

- **Status:** Shipped (Shipped in Agentuto (#/course/18.03))
- **Key result:** m x″ + b x′ + k x = F(t)
- **Syllabus bridge:** AP Calculus BC (Slope Fields) · IB Math AA HL
- **Open texts:** [Lebl Notes on Diffy Qs](https://www.jirka.org/diffyqs/) (CC BY-SA 4.0 or CC BY-NC-SA 4.0) · [Trench Elementary Diff. Eq.](https://digitalcommons.trinity.edu/mono/9/) (CC BY-NC-SA 3.0)
- **Courses:** [MIT 18.03SC (OCW)](https://ocw.mit.edu/courses/18-03sc-differential-equations-fall-2011/) · [Boston Univ Dynamical Systems](http://math.bu.edu/DYSYS/)
- **Agentuto fit:** Shipped with 3 instruments: harmonic-oscillator (2nd-order resonance & phase), rc-rl-circuits (1st-order relaxation), and lorenz-attractor (nonlinear chaos & Lyapunov divergence).

## 8.01 Classical Mechanics

- **Status:** Shipped (Shipped in Agentuto (#/course/8.01))
- **Key result:** m r″ = F(r, v, t)
- **Syllabus bridge:** AP Physics C: Mechanics · IB Physics HL
- **Open texts:** [OpenStax University Physics Vol. 1](https://openstax.org/details/books/university-physics-volume-1) (CC BY-NC-SA 4.0, link only) · [Dourmashkin MIT 8.01 Notes](https://ocw.mit.edu/courses/8-01sc-classical-mechanics-fall-2016/pages/online-textbook/) (CC BY-NC-SA 4.0)
- **Courses:** [MIT 8.01SC (OCW)](https://ocw.mit.edu/courses/8-01sc-classical-mechanics-fall-2016/) · [Yale PHYS 200 (Shankar)](https://oyc.yale.edu/physics/phys-200)
- **Agentuto fit:** Shipped with 3 instruments: projectile-drag, conservation-momentum, and kepler-orbits.

## 8.02 Electricity & Magnetism

- **Status:** Shipped (Shipped in Agentuto (#/course/8.02))
- **Key result:** ∇·E = ρ/ε₀,   ∮ E·dl = −dΦ_B/dt
- **Syllabus bridge:** AP Physics C: E&M · IB Physics HL
- **Open texts:** [OpenStax University Physics Vol. 2](https://openstax.org/details/books/university-physics-volume-2) (CC BY-NC-SA 4.0, link only) · [MIT 8.02 Course Notes](https://ocw.mit.edu/courses/8-02-physics-ii-electricity-and-magnetism-spring-2007/pages/readings/) (CC BY-NC-SA 4.0)
- **Courses:** [MIT 8.02 (OCW)](https://ocw.mit.edu/courses/8-02-physics-ii-electricity-and-magnetism-spring-2019/) · [Yale PHYS 201 (Shankar)](https://oyc.yale.edu/physics/phys-201)
- **Agentuto fit:** Shipped with 5 instruments: lorentz-force, faraday-induction, gauss-flux, lcr-circuit, and rc-rl-circuits.

## 8.03 Vibrations, Waves & Optics

- **Status:** Shipped (Shipped in Agentuto (#/course/8.03))
- **Key result:** ∂²y/∂t² = v² ∂²y/∂x²
- **Syllabus bridge:** AP Physics 2 / C · IB Physics HL (Wave Phenomena)
- **Open texts:** [OpenStax University Physics Vol. 1 & 3](https://openstax.org/details/books/university-physics-volume-3) (CC BY-NC-SA 4.0, link only) · [Georgi The Physics of Waves](https://www.people.fas.harvard.edu/~hgeorgi/new.htm) (Free Author PDF)
- **Courses:** [MIT 8.03SC (OCW)](https://ocw.mit.edu/courses/8-03sc-physics-iii-vibrations-and-waves-fall-2016/)
- **Agentuto fit:** Shipped with 3 instruments: standing-waves, doppler-shift, and wave-optics.

## 8.04 Quantum Physics I

- **Status:** Shipped (Shipped in Agentuto (#/course/8.04))
- **Key result:** iℏ ∂ψ/∂t = −(ℏ²/2m) ∂²ψ/∂x² + V(x)ψ
- **Syllabus bridge:** AP Physics 2 · IB Physics HL (Quantum & Nuclear)
- **Open texts:** [OpenStax University Physics Vol. 3 (Ch. 6–7)](https://openstax.org/details/books/university-physics-volume-3) (CC BY-NC-SA 4.0, link only) · [MIT 8.04 Lecture Notes & Problem Sets](https://ocw.mit.edu/courses/8-04-quantum-physics-i-spring-2016/pages/assignments/) (CC BY-NC-SA 4.0)
- **Courses:** [MIT 8.04 (Zwiebach / Allan Adams OCW)](https://ocw.mit.edu/courses/8-04-quantum-physics-i-spring-2016/)
- **Agentuto fit:** Shipped with 2 instruments: photoelectric-effect and quantum-tunneling.

## 8.044 Statistical Physics & Thermodynamics

- **Status:** Shipped (Shipped in Agentuto (#/course/8.044))
- **Key result:** P V = N k_B T,   S = k_B ln Ω
- **Syllabus bridge:** AP Physics 2 · IB Physics HL (Thermal Physics)
- **Open texts:** [OpenStax University Physics Vol. 2 (Ch. 1–4)](https://openstax.org/details/books/university-physics-volume-2) (CC BY-NC-SA 4.0, link only) · [Tong Statistical Physics Notes (Cambridge)](https://www.damtp.cam.ac.uk/user/tong/statphys.html) (Free Academic Notes)
- **Courses:** [MIT 8.044 (OCW)](https://ocw.mit.edu/courses/8-044-statistical-physics-i-spring-2013/) · [Stanford Statistical Mechanics (Susskind)](https://theoreticalminimum.com/courses/statistical-mechanics/2013/spring)
- **Agentuto fit:** Shipped with 2 instruments: maxwell-boltzmann and carnot-cycle.

## 9.00 Introduction to Psychology

- **Status:** Shipped (Shipped in Agentuto (#/course/9.00))
- **Key result:** d′ = z(H) − z(FA),   c = −z(FA),   AUC = Φ(d′/√2)
- **Syllabus bridge:** AP Psychology (Sensation & Perception)
- **Open texts:** [OpenStax Psychology 2e](https://openstax.org/details/books/psychology-2e) (CC BY-NC-SA 4.0, link only) · [WISE: Signal Detection: d′ Defined](https://wise.cgu.edu/?p=2061) (© 2015 Claremont Graduate University, no licence stated: numbers cited, link only)
- **Agentuto fit:** Shipped with 1 instrument: `signal-detection` (separating sensitivity d′ from criterion c; empirical ROC curve).

## 18.01 / 18.02 Single & Multivariable Calculus

- **Status:** Proposed (Zero-Code Course Ready (Data Only))
- **Key result:** ∫_C F·dr = ∬_S (∇×F)·dS
- **Syllabus bridge:** AP Calculus BC · IB Math AA HL
- **Open texts:** [OpenStax Calculus Vols 1–3](https://openstax.org/details/books/calculus-volume-3) (CC BY-NC-SA 4.0) · [Apex Calculus](https://www.apexcalculus.com/) (CC BY-NC 4.0) · [Paul’s Online Math Notes](https://tutorial.math.lamar.edu/) (Free Reference)
- **Courses:** [MIT 18.01 / 18.02 (OCW)](https://ocw.mit.edu/courses/18-02sc-multivariable-calculus-fall-2010/) · [UC Berkeley MATH 1A/1B/53](https://math.berkeley.edu/courses/choosing/lowerdivcourses)
- **Agentuto fit:** Composes existing sandboxes immediately: gauss-flux (surface flux integrals), faraday-induction (time derivative dΦ/dt), projectile-drag (kinematic integrals), kepler-orbits (line integrals & conservative fields).

## 18.06 Linear Algebra & Matrix Methods

- **Status:** Proposed (Highest Cross-Track Priority)
- **Key result:** A v = λ v,   A = U Σ Vᵀ
- **Syllabus bridge:** IB Math AI HL (Matrices & Eigenvalues)
- **Open texts:** [Margalit & Rabinoff Interactive Linear Algebra](https://textbooks.math.gatech.edu/ila/) (GFDL / CC BY-SA) · [Hefferon Linear Algebra](https://hefferon.net/linearalgebra/) (GFDL or CC BY-SA 2.5) · [Boyd & Vandenberghe VMLS](https://vmls-book.stanford.edu/) (Free PDF)
- **Courses:** [MIT 18.06 (Strang OCW)](https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/) · [Stanford ENGR 108 (VMLS)](https://vmls-book.stanford.edu/)
- **Agentuto fit:** Partially covered by standing-waves (normal modes) and harmonic-oscillator. Adding 1 new 2D Transformation / Eigenvalue / SVD sandbox unlocks CS, NLP embeddings, Quantum operators, and Statistics PCA.

## 18.05 / 6.041 Probability, Random Variables & Bayesian Inference

- **Status:** Proposed (Core for NLP, Stat, CS & EE)
- **Key result:** P(H|D) = P(D|H) P(H) / P(D)
- **Syllabus bridge:** AP Statistics · IB Math AA/AI HL
- **Open texts:** [OpenIntro Statistics (Diez et al.)](https://www.openintro.org/book/os/) (CC BY-SA 3.0) · [Grinstead & Snell Intro to Probability](https://math.dartmouth.edu/~prob/prob/prob.pdf) (GFDL) · [Seeing Theory (Brown Univ)](https://seeing-theory.brown.edu/) (Interactive Ref)
- **Courses:** [MIT 18.05 (OCW)](https://ocw.mit.edu/courses/18-05-introduction-to-probability-and-statistics-spring-2022/) · [MIT RES.6-012 Intro to Probability (OCW)](https://ocw.mit.edu/courses/res-6-012-introduction-to-probability-spring-2018/) · [Harvard Stat 110 (Blitzstein)](https://projects.iq.harvard.edu/stat110/home)
- **Agentuto fit:** Connects directly to maxwell-boltzmann (continuous speed distributions) and quantum-tunneling (wavefunction probability density), plus linear/exponential regression in src/core.

## 6.042J / CS70 Discrete Mathematics, Information & Markov Chains

- **Status:** Proposed (Gateway for CS, NLP & Stat)
- **Key result:** H(X) = −∑ p(x) log₂ p(x),   π P = π
- **Syllabus bridge:** AP Computer Science A · IB Math HL Discrete
- **Open texts:** [Lehman, Leighton & Meyer (MIT Text)](https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-spring-2015/pages/readings/) (CC BY-NC-SA 4.0) · [Levin Discrete Mathematics](https://discrete.openmathbooks.org/) (CC BY-SA 4.0)
- **Courses:** [MIT 6.042J Math for CS (OCW)](https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-spring-2015/) · [UC Berkeley CS 70](https://www.eecs70.org/)
- **Agentuto fit:** Bridges statistical entropy (maxwell-boltzmann) to Shannon cross-entropy and n-gram Markov transition chains in NLP.

## 6.002 / 6.003 Circuits, Signals & Systems (Fourier / Laplace)

- **Status:** Proposed (Zero-Code Course Ready (Data Only))
- **Key result:** H(jω) = Y(jω)/X(jω),   X(f) = ∫ x(t) e^(−j2πft) dt
- **Syllabus bridge:** AP Physics C: E&M (Circuits) · IB Physics HL
- **Open texts:** [Ulaby, Maharbiz & Furse Signals & Systems](https://ss2.eecs.umich.edu/) (CC BY-NC-ND 4.0 (Free PDF)) · [Smith Scientist & Engineer’s Guide to DSP](https://www.dspguide.com/) (Free Online Book)
- **Courses:** [MIT 6.002 Circuits & Electronics (OCW)](https://ocw.mit.edu/courses/6-002-circuits-and-electronics-spring-2007/) · [MIT 6.003 Signals & Systems (OCW)](https://ocw.mit.edu/courses/6-003-signals-and-systems-fall-2011/) · [UC Berkeley EECS 16A / 16B](https://eecs16a.org/)
- **Agentuto fit:** Composes existing sandboxes immediately: rc-rl-circuits (step response & time constant τ), lcr-circuit (Bode magnitude/phase & Q-factor), standing-waves (Fourier harmonic synthesis), doppler-shift.

## 6.036 / CS224N-Prep Optimization, Numerical Methods & Statistical Learning

- **Status:** Proposed (Bridge to Junior CS, NLP & Stat)
- **Key result:** θ_{t+1} = θ_t − η ∇L(θ_t),   p(y|x) = softmax(W x + b)
- **Syllabus bridge:** AP Statistics + AP Calculus BC (Multivariable Chain Rule)
- **Open texts:** [Deisenroth et al. Math for Machine Learning (MML)](https://mml-book.github.io/) (Free Cambridge PDF) · [James, Witten, Hastie & Tibshirani ISLR / ISLP](https://www.statlearning.com/) (Free Author PDF) · [Jurafsky & Martin Speech and Language Processing](https://web.stanford.edu/~jurafsky/slp3/) (Free Draft PDF)
- **Courses:** [MIT 6.036 Intro to ML (OCW)](https://ocw.mit.edu/courses/6-036-introduction-to-machine-learning-fall-2020/) · [Stanford CS224N (NLP)](https://web.stanford.edu/class/cs224n/)
- **Agentuto fit:** Uses existing linear/exponential regression in src/core; pairs with a future 2D Gradient Descent / Loss Surface & Softmax Temperature instrument.

Unverified licence labels: Ulaby, Maharbiz & Furse; Lehman, Leighton & Meyer. Built by Gemini 3.8 Flash, reviewed by Claude Opus 5.5 (2026-11-08).
