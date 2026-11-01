# Agentuto User Guide
**Empirical Science Exploration & Virtual Laboratory Manual**  
*Topic alignment: AP Physics 1/2/C, IB Physics (SL/HL), and undergraduate topics from MIT OpenCourseWare 8.01, 8.02, 8.03, 8.04, 8.044 and 18.03. Labels describe topic alignment only; Agentuto is not affiliated with or endorsed by these organizations.*

---

## 1. Introduction & Philosophy

Traditional digital science simulations often railroad learners through linear, multiple-choice steps where answers are spoon-fed. **Agentuto** takes a radically different pedagogical approach:

1. **Continuous Parameter Spaces:** Sliders let you set physical variables continuously (e.g., magnetic field vector $\mathbf{B}$, damping coefficient $b$, slit separation $d$, or barrier height $V_0$), allowing you to explore edge cases, resonance catastrophe, and relativistic/quantum limits.
2. **Empirical Measurement, Never Spoon-Fed Answers:** You have access to precision virtual laboratory apparatus (calipers, photogates, sparkline oscilloscopes, and in-app linear & exponential regression curve fitting).
3. **Open Data Export:** Every experiment streams raw RFC-4180 telemetry that can be downloaded in 1-click as `.csv` for external analysis in Excel, Google Sheets, Python/Pandas, or Vernier Logger Pro.
4. **Optional Socratic AI Companion (bring your own key):** Everything above works without AI. If you choose to enable it, the tutor is instructed not to hand out final answers and instead asks targeted questions about your live telemetry. See [§5](#5-the-optional-socratic-ai-tutor-bring-your-own-key) and its disclaimer.

### 1.1 Getting Started (Windows & Mac)

**Browser:** Use a recent Chrome, Edge or Safari. On a Mac, Safari and Chrome both work; WebGL (needed for the 3D sandboxes) is on by default.

#### Option A (easiest): let an AI coding agent set it up for you

If you already have an AI coding agent (a command-line tool or an editor with one built in) that you are allowed
to use, it can do the whole setup for you. Open a new session, paste the prompt below, and approve the steps it
asks about. Agentuto does not provide, support or vouch for any AI service: what is available, what it costs and
what its limits are is up to its provider, and your school, college or employer may restrict generative AI.
Follow the rules that apply to you. Without an agent, use Option B.

The prompt has rules as well as steps. They are there so that a model of any size stays inside the project
folder and does nothing you did not ask for.

```text
Please set up and run the Agentuto science simulator on my computer. I am not a developer, so explain anything you need me to do in plain words, and tell me what each command does before you run it.

Rules. All of them are mandatory.
- Work only inside a folder named "agentuto" in my home folder. Use the real full path: never pass a literal "~" to a command. Do not create, change or delete anything outside that folder, and do not edit any file inside the project.
- Do not use sudo or administrator rights. Do not install anything globally. Do not download and run installer scripts ("curl | sh" and anything like it). If something must be installed, stop, tell me what and why, and wait for my answer.
- Do not commit, push, reset, clean or force anything in git, and do not change git settings or remotes. The only git commands you may run are "git --version", "git clone", and "git pull --ff-only". If "git pull --ff-only" fails or reports local changes, stop and tell me.
- Do not read, print or ask for passwords, API keys, tokens or the contents of any .env file.
- If any command fails, stop, explain the error in plain words, and ask me before trying anything different. Do not retry in a loop.
- Do not open any web page except http://localhost on the port the app reports, and https://nodejs.org if Node.js needs installing.

Steps.
1. Tell me which operating system you are on. Check that git and Node.js are installed ("git --version", "node --version").
   - If git is missing, tell me how to install it on my system and wait.
   - If Node.js is missing or older than version 20, tell me to install the LTS version from https://nodejs.org and wait until I say it is done.
2. If the folder agentuto does not exist in my home folder, run:
   git clone https://github.com/danielw-sudo/agentuto.git <full path of the folder>
   If it already exists, run "git pull --ff-only" inside it.
3. Inside that folder run "npm ci" to install the dependencies. If npm prints "allow-scripts" warnings about esbuild, ignore them: the app works without approving those scripts.
4. Inside that folder start the app with "npm run dev". Run it in the background so it keeps running, and wait until it prints a "Local:" address (normally http://localhost:5173).
5. Open that address in my default browser, or give me the link to click.
6. Finally, tell me in two short lines how to stop the app and what to ask you next time to start it again.
```

**Next time**, paste this shorter prompt:

```text
Please start Agentuto: inside the agentuto folder in my home folder run "npm run dev" in the background, wait for the "Local:" address, then open it in my browser. Follow the same rules as before: stay inside that folder, no sudo, no global installs, no git commands, and if anything fails stop and explain it to me.
```

**To get the latest version**, paste:

```text
Please update Agentuto: inside the agentuto folder in my home folder run "git pull --ff-only", then "npm ci", then start it with "npm run dev" in the background and open the "Local:" address in my browser. Follow the same rules as before: stay inside that folder, no sudo, no global installs, no other git commands, and if "git pull --ff-only" fails or anything else goes wrong, stop and explain it to me.
```

> To add instruments of your own that stay on your computer, see [Your own instruments](LOCAL_MODULES.md).

> If something goes wrong, copy the agent's error message back to it and ask *"What does this mean and how do I fix it?"*. If the address is not `5173` (for example `5174`, because another copy is already running), use the address the agent reports.

#### Option B: set it up yourself

**Running Agentuto on your own computer** (one-time setup, about 10 minutes):
1. Install **Node.js (LTS)** from [nodejs.org](https://nodejs.org). On a Mac, open the downloaded `.pkg` file and click through the installer.
2. On the [Agentuto GitHub page](https://github.com/danielw-sudo/agentuto), click the green **Code** button → **Download ZIP**, then double-click the ZIP to unzip it. (Using `git` on a Mac instead may first prompt you to install Apple's "Command Line Developer Tools"; click Install, or just use the ZIP.)
3. Open a terminal:
   * **Mac:** press **⌘ Space**, type `Terminal`, press Return.
   * **Windows:** open **PowerShell** from the Start menu.
4. Go into the unzipped folder and start the app. On a Mac, if the ZIP was unzipped in Downloads:
   ```bash
   cd ~/Downloads/agentuto-main
   npm ci
   npm run dev
   ```
   (Tip: type `cd ` with a space, then drag the folder from Finder into the Terminal window to fill in its path.)
5. Open **http://localhost:5173** in your browser.
6. To stop the app, click the Terminal window and press **Control + C** (on a Mac this is the Control key, not ⌘). Next time, only steps 3–5 are needed (skip `npm ci`).

**Mac tips:**
* **3D views on a trackpad:** click-and-drag to rotate, two-finger scroll or pinch to zoom, hold **Shift** (or **⌘**) while dragging to pan (not available in the Faraday sandbox).
* **Keyboard:** where a guide says **Ctrl** (copy, paste), use **⌘** on a Mac, e.g. **⌘ V** to paste your API key.
* **CSV downloads:** Safari may ask *"Do you want to allow downloads on this site?"*. Click **Allow**. Files go to your **Downloads** folder and open in **Numbers** by default (or Excel, if installed). The lines starting with `#` at the top are experiment notes, not data.
* **Reload after an update:** press **⌘ R** (or **⌘ Shift R** if the page still looks old).

---

## 2. Navigating the Interface

### 2.1 The Master HUD (Heads-Up Display)
* **Top Header:** 
  * Displays the **Active Concept Title**, **Curriculum Tag** (e.g., `MIT 8.01 Classical Mechanics`), and **Governing Differential Equation**.
  * Use the **Simulation Selector dropdown** to switch between any of the 17 canonical sandboxes.
* **Floating Glassmorphic Control Deck (Right Panel):**
  * Houses real-time parameter sliders. Sliders update instantly as you drag.
  * Click **"Reset Defaults"** at any time to return to canonical initial conditions.
* **Playback & Telemetry Dock (Bottom Bar):**
  * **Play / Pause:** Starts or freezes the continuous physics integration.
  * **Step Forward (1 Frame):** Advances the simulation by $\Delta t = 0.005\text{ s}$ ($200\text{ Hz}$).
  * **Speed Multipliers:** Toggle between `0.25x` / `0.5x` (slow-motion analysis), `1x` (real-time), and `2x` (accelerated).
  * **Live Stream Recorder:** Red recording dot indicates in-memory ring buffer logging. Displays active sample count.
  * **Export CSV:** Downloads the collected data buffer with complete scientific metadata headers.

---

## 3. The 17 Interactive Sandboxes

### 1. Lorentz Force in Crossed E & B Fields (`lorentz-force` — MIT 8.02)
* **Physical Concept:** Classical (non-relativistic) charged-particle dynamics:
  $$m\mathbf{a} = q(\mathbf{E} + \mathbf{v} \times \mathbf{B})$$
* **What to Explore:**
  * **Pure Cyclotron Orbits:** Set $E_y = 0$, $B_z > 0$. Verify that the orbital radius satisfies $r = \frac{mv}{qB}$ and kinetic energy is strictly conserved.
  * **Velocity Selector Equilibrium:** Adjust $E_y$ and $B_z$ such that $v_x = E_y / B_z$. Observe that the net Lorentz force cancels to zero and the particle travels in a straight line undeflected.
  * **Cycloidal Drift Trajectories:** Set $E_y \ne 0$ with initial velocity below or above $E/B$ to observe trochoidal and cycloidal drift.

### 2. Damped & Driven Harmonic Oscillator (`harmonic-oscillator` — MIT 18.03)
* **Physical Concept:** Second-order linear ordinary differential equations:
  $$m\ddot{x} + b\dot{x} + kx = F_0\cos(\omega t)$$
* **What to Explore:**
  * **Three Damping Regimes:** 
    * Underdamped: $b < 2\sqrt{km}$ (spiral phase portrait, decaying oscillation).
    * Critically Damped: $b = 2\sqrt{km}$ (fastest return to equilibrium without overshoot).
    * Overdamped: $b > 2\sqrt{km}$ (sluggish exponential creep).
  * **Resonance Catastrophe:** Set $F_0 > 0$ and sweep the driving frequency $\omega$ across $\omega_0 = \sqrt{k/m}$. At $\omega = \omega_0$ the response lags the drive by $\delta = \pi/2$. With light damping the amplitude grows very large; its peak sits slightly below $\omega_0$, at $\omega_r = \sqrt{\omega_0^2 - b^2/(2m^2)}$.
  * **Phase Portrait ($x$ vs. $\dot{x}$):** Live 2D phase space: decaying spirals for free damped motion, and a closed steady-state orbit (an ellipse) once a driven oscillator settles.

### 3. Lorenz Attractor & Non-Linear Chaos (`lorenz-attractor` — MIT 18.03)
* **Physical Concept:** 3D non-linear dynamical systems and deterministic chaos:
  $$\dot{x} = \sigma(y - x), \quad \dot{y} = x(\rho - z) - y, \quad \dot{z} = xy - \beta z$$
* **What to Explore:**
  * **The Butterfly Effect:** Launch twin trajectories separated by a tiny perturbation (default $\Delta x_0 = 10^{-3}$; the slider goes down to $10^{-4}$). Watch them evolve identically before diverging exponentially across the two attractor lobes.
  * **Lyapunov Exponent:** Use the in-app Lab Notebook to fit an exponential to $\Delta r(t)$ to estimate the largest Lyapunov exponent $\lambda$. Fit only the early growth phase: once the separation reaches the size of the attractor it stops growing, and including that part biases $\lambda$ low.

### 4. Faraday's Law & Lenz's Induction (`faraday-induction` — MIT 8.02)
* **Physical Concept:** Electromagnetic induction and eddy current braking:
  $$\mathcal{E} = -\frac{d\Phi_B}{dt}, \quad F_{\text{Lenz}} = -\frac{\mathcal{E}^2}{R \, v_z}$$
* **What to Explore:**
  * **Eddy Current Braking:** Drop the oscillating bar magnet through the copper solenoid coil. Lower the coil resistance $R$ to observe rapid magnetic dissipation into Joule heat.
  * **Flux vs. EMF Phase Shift:** Notice that induced EMF is zero exactly when the magnet passes the coil center ($z = 0$, maximum flux), but peaks at the coil edges where $d\Phi/dz$ is steepest.

### 5. Maxwell-Boltzmann Kinetic Theory (`maxwell-boltzmann` — MIT 8.044)
* **Physical Concept:** Statistical mechanics, ideal gas law, and molecular speeds in a **2D** gas (so "volume" is the box area $A$, the gas law reads $PA = Nk_BT$, and the speed distribution below is the 2D form; the 3D Maxwell–Boltzmann distribution has a $v^2$ prefactor instead):
  $$PV = N k_B T, \quad f(v) = \frac{mv}{k_BT} e^{-\frac{mv^2}{2k_BT}}$$
* **What to Explore:**
  * **Boyle's Law Isothermal Compression:** Slide the movable compression piston to shrink the container volume. Halving the area at constant temperature doubles the measured wall-impulse pressure.
  * **Temperature Speed Scaling:** Double the absolute temperature $T$. Observe how the real-time empirical velocity histogram broadens and shifts such that $v_{\text{rms}} \propto \sqrt{T}$.
  * **Molecular Mass Separation:** Compare light vs. heavy gases.

### 6. Quantum Wave Mechanics & Barrier Tunneling (`quantum-tunneling` — MIT 8.04)
* **Physical Concept:** 1D Time-Dependent Schrödinger Equation:
  $$i\hbar \frac{\partial \psi}{\partial t} = -\frac{\hbar^2}{2m} \frac{\partial^2 \psi}{\partial x^2} + V(x)\psi$$
* **What to Explore:**
  * **Evanescent Spatial Decay ($E < V_0$):** Set incident wavepacket energy below barrier height. Observe finite quantum transmission probability $T > 0$ and exponential decay inside the barrier ($T \propto e^{-2\kappa d}$).
  * **Quantum Reflections Above the Barrier ($E > V_0$):** Even when energy exceeds the barrier, observe partial quantum wave reflections from the potential discontinuity.
  * **Probability Conservation (Unitarity):** Monitor the live norm readout confirming $\int |\psi|^2 dx \equiv 1.000000$ to 12 decimal places.

### 7. Wave Optics: Double-Slit & Grating Diffraction (`wave-optics` — MIT 8.03)
* **Physical Concept:** Huygens-Fresnel wave interference and Fraunhofer diffraction:
  $$I(y) = I_0 \left[\frac{\sin\beta}{\beta}\right]^2 \cos^2\alpha, \quad \Delta y = \frac{\lambda L}{d}$$
* **What to Explore:**
  * **Wavelength-to-sRGB Laser:** Sweep the laser wavelength slider from $380\text{ nm}$ (deep violet) to $750\text{ nm}$ (deep red, at the edge of the visible range). Watch the physical laser beam color and the projected fringe spacing scale dynamically.
  * **Virtual Caliper Measurement:** Drag the on-screen digital caliper over the projection screen to measure fringe width $\Delta y$ and solve for slit separation $d$.
  * **Diffraction Grating Peaks ($N = 5$):** Increase slit count from 2 to 5 to observe sharp interference maxima flanked by secondary sub-peaks.

### 8. Keplerian Orbits & Celestial Mechanics (`kepler-orbits` — MIT 8.01)
* **Physical Concept:** Newtonian inverse-square gravitation and orbital conservation:
  $$\ddot{\mathbf{r}} = -\frac{GM}{r^3}\mathbf{r}, \quad T^2 = \frac{4\pi^2}{GM} a^3$$
* **What to Explore:**
  * **Conic Sections:** With a purely tangential launch at $r_0$: $v_t = v_c = \sqrt{GM/r_0}$ gives a circle ($e = 0$); any other $v_t$ below $\sqrt{2GM/r_0}$ gives an ellipse ($r_0$ is aphelion if $v_t < v_c$, perihelion if $v_t > v_c$); $v_t = \sqrt{2GM/r_0}$ is the parabolic escape threshold, and faster launches are hyperbolic.
  * **Kepler's Second Law:** The radius vector sweeps equal areas in equal times. Watch the green velocity vector grow as the satellite whips through perihelion and shrink near aphelion, so that $r \times v_\perp$ stays constant.
  * **Kepler's Third Law:** For several orbits, **measure** the period $T$ yourself (the time between two successive perihelion passages, read from the clock or the Photogate) and note the semi-major axis $a$. Don't use the displayed period: it is calculated from Kepler's third law, so plotting it would only confirm the formula it came from. A plot of $T^2$ against $a^3$ is a straight line with slope $4\pi^2/GM$; equivalently, $\log T$ against $\log a$ has slope $3/2$.

### 9. Projectile Kinematics & Quadratic Air Drag (`projectile-drag` — MIT 8.01)
* **Physical Concept:** 2D kinematics with atmospheric fluid resistance:
  $$m\ddot{\mathbf{r}} = m\mathbf{g} - \frac{1}{2} C_d \rho A |\mathbf{v}|\mathbf{v}$$
* **What to Explore:**
  * **Vacuum vs. Air Drag Ghost Curve:** Compare the real atmospheric trajectory against the faint cyan dashed vacuum parabola ($C_d = 0$).
  * **Optimal Launch Angle Shift:** In a vacuum, $45^\circ$ maximizes horizontal range (from ground level). With drag the optimum drops below $45^\circ$, by an amount that depends on how strong drag is relative to weight: about $41^\circ$ with the default settings, around $35^\circ$ for a fast ($80$ m/s) 1 kg ball, and as low as about $25^\circ$ for a light, fast projectile. Find it yourself by sweeping the launch angle and recording the range.
  * **Terminal Velocity:** Drop from an elevated cliff to observe acceleration diminishing as drag force approaches weight ($v \to v_{\text{term}} = \sqrt{2mg / (C_d \rho A)}$).

### 10. LCR Electrical Oscillators & AC Resonance (`lcr-circuit` — MIT 8.02)
* **Physical Concept:** Driven 2nd-order electrical circuits and phasor analysis:
  $$L\ddot{q} + R\dot{q} + \frac{q}{C} = V_0\cos(\omega t)$$
* **What to Explore:**
  * **Resonance Condition:** Set $f = f_0 = \frac{1}{2\pi\sqrt{LC}}$. Observe that reactances cancel ($X_L = X_C$), impedance collapses to $Z = R$, and current reaches peak amplitude with zero phase lag ($\phi = 0^\circ$).
  * **Complex Phasor Diagram:** Watch the rotating vectors $\mathbf{V}_R$, $\mathbf{V}_L$, and $\mathbf{V}_C$ in the complex plane.
  * **Mobile Electron Current:** Observe glowing drift electrons circulating clockwise or counter-clockwise in phase with $i(t)$.

---

### 11. Standing Waves & Normal Modes (`standing-waves` — MIT 8.03)
* **Physical Concept:** 1D wave equation on a clamped string:
  $$\frac{\partial^2 y}{\partial t^2} = v^2 \frac{\partial^2 y}{\partial x^2}, \quad v = \sqrt{\frac{T}{\mu}}, \quad f_n = \frac{n v}{2L}$$
* **What to Explore:**
  * **Stationary Nodes:** Select harmonic mode $n = 2, 3, 4$. Observe positions where string displacement remains identically zero for all time ($y \equiv 0$).
  * **Energy Oscillations:** Watch mechanical energy oscillate between 100% kinetic (at zero crossing) and 100% elastic potential (at maximum displacement).

### 12. Doppler Shift & Mach Cones (`doppler-shift` — MIT 8.03)
* **Physical Concept:** Kinematics of moving sources and shock wave geometry:
  $$f' = f_0 \frac{c \pm v_r}{c \mp v_s}, \quad \sin\mu = \frac{c}{v_s} = \frac{1}{M}$$
* **What to Explore:**
  * **Subsonic Compression ($M < 1$):** Wavefronts compress ahead of the source and stretch behind, shifting the observed pitch higher or lower.
  * **Supersonic Shock Envelope ($M > 1$):** Increasing source speed past wave speed forms a conical Mach shock wave with cone half-angle $\mu = \arcsin(1/M)$.
  * **Oblique Pass Doppler Dip:** Observe the smooth continuous S-curve frequency drop as the source sweeps past an off-axis observer.

### 13. Photoelectric Effect & Photon Quantization (`photoelectric-effect` — MIT 8.04)
* **Physical Concept:** Einstein's photoelectric equation and work function:
  $$K_{\max} = hf - \Phi = eV_{\text{stop}}, \quad f_c = \frac{\Phi}{h}$$
* **What to Explore:**
  * **Threshold Frequency Cutoff:** Below threshold frequency ($f < f_c$), no electrons are emitted regardless of beam intensity.
  * **Stopping Potential $V_{\text{stop}}$:** Increase retarding voltage until photocurrent drops strictly to zero, directly isolating Planck's constant $h = e \cdot (dV_{\text{stop}}/df)$.
  * **Intensity vs. Saturation Current:** Raising light intensity linearly boosts saturation photocurrent without changing maximum electron kinetic energy.

### 14. Carnot Cycle & Second Law of Thermodynamics (`carnot-cycle` — MIT 8.044)
* **Physical Concept:** Maximum theoretical efficiency of heat engines:
  $$\eta_{\text{Carnot}} = 1 - \frac{T_C}{T_H}, \quad \oint \frac{dQ_{\text{rev}}}{T} = 0$$
* **What to Explore:**
  * **Synchronized $P-V$ & $T-S$ Diagrams:** Step through the 4 reversible stages (isothermal expansion, adiabatic expansion, isothermal compression, adiabatic compression).
  * **Net Work Output:** The area enclosed within both indicator diagrams equals net mechanical work: $W_{\text{net}} = \Delta T \Delta S$.
  * **Clausius Equality:** Track the live cyclic entropy integral confirming $\Delta S_{\text{cycle}} \equiv 0\text{ J/K}$.

### 15. Gauss's Law & Electrostatic Flux Symmetry (`gauss-flux` — MIT 8.02)
* **Physical Concept:** Surface flux integration and charge conservation:
  $$\oint_{\mathcal{S}} \mathbf{E} \cdot d\mathbf{A} = \frac{Q_{\text{enc}}}{\varepsilon_0}$$
* **What to Explore:**
  * **Dipole Cancellation:** Enclosing both charges of an electric dipole yields strictly zero net flux ($\Phi_{\text{net}} = 0$).
  * **Monopole Flux Invariance:** Expanding the Gaussian sphere radius around an isolated charge leaves net flux invariant, as expected for an inverse-square field.
  * **Outside Neutrality:** Move the Gaussian surface outside all charges to observe that entering flux equals exiting flux.

### 16. Linear Momentum & Center-of-Mass Invariance (`conservation-momentum` — MIT 8.01)
* **Physical Concept:** Isolated system momentum invariance and kinetic energy partition:
  $$\frac{d\mathbf{P}_{\text{total}}}{dt} = \mathbf{0}, \quad \mathbf{V}_{\text{cm}} = \text{const}, \quad K_{\text{total}} = K_{\text{cm}} + K_{\text{internal}}$$
* **What to Explore:**
  * **Elastic Collisions ($e = 1.0$):** In equal-mass collisions, pucks completely exchange velocities while conserving total kinetic energy.
  * **Completely Inelastic Collision ($e = 0.0$):** The bodies leave the collision with a common velocity, and all kinetic energy of relative motion is dissipated: $\Delta K = \tfrac{1}{2}\mu v_{\text{rel}}^2$ with $\mu = m_1 m_2/(m_1+m_2)$, while $\mathbf{V}_{\text{cm}}$ is unchanged. The fraction lost depends on the setup: exactly 50% for equal masses with one at rest, 75% if the target is three times heavier, and 94% with the default head-on settings.
  * **2D Glancing Scatter:** Offset the impact parameter ($b > 0$). For an elastic collision of **equal masses with the target initially at rest**, the two pucks leave at exactly $90^\circ$ to each other (try the "2D Glancing Scatter" roadmap preset). Unequal masses or a moving target give other angles.
  * **Isolated-system caveat:** The table walls exert external forces. Momentum and $\mathbf{V}_{\text{cm}}$ are conserved only until a puck touches a wall, so record your measurements before then.

### 17. RC & RL Transient Relaxation Circuits (`rc-rl-circuits` — MIT 8.02 / 18.03)
* **Physical Concept:** First-order linear differential equations and time constants:
  $$R\frac{dq}{dt} + \frac{q}{C} = \mathcal{E}, \quad L\frac{di}{dt} + Ri = \mathcal{E}, \quad \tau_{\text{RC}} = RC, \quad \tau_{\text{RL}} = \frac{L}{R}$$
* **What to Explore:**
  * **The 63.2% Rule:** Monitor capacitor voltage $V_C(t)$ reaching exactly $V_0(1 - 1/e) \approx 63.2\%$ of supply voltage at $t = \tau$.
  * **50% Capacitive Energy Theorem:** Verify that during complete DC charging, exactly 50% of supplied energy is stored in the capacitor ($\frac{1}{2}CV^2$), and exactly 50% is dissipated as Ohmic heat in the resistor regardless of $R$.
  * **RL Inductor Back-EMF:** Observe the initial voltage spike across the inductor ($V_L = V_0$) resisting current onset, followed by exponential decay as current climbs to $V_0/R$.

---

## 4. Virtual Laboratory Measurement Instruments

### 4.1 Digital Caliper
* **How to Open:** Click the **Caliper** button in the bottom dock.
* **Usage:** Drag either jaw to measure distances on screen (in millimeters or arbitrary world meters). Use it to measure diffraction fringe spacing, spring displacements, or orbital radii directly.

### 4.2 Virtual Photogate Sensor
* **How to Open:** Click the **Photogate** button in the bottom dock.
* **Usage:** Position the sensor at any coordinate along the particle path. The photogate detects beam interruptions and records the transit time $\Delta t$, allowing you to calculate instantaneous velocity:
  $$v = \frac{w_{\text{beam}}}{\Delta t}$$

### 4.3 In-App Lab Notebook & Curve Fitter
* **How to Open:** Click the **Notebook** icon in the bottom dock.
* **Usage:**
  1. Select any physical variable for the **X-Axis** and **Y-Axis** from your recorded telemetry (e.g., $t$ vs. $x$, or $a^3$ vs. $T^2$).
  2. Choose a regression model:
     * **Linear Regression ($y = mx + b$):** Computes slope $m$, intercept $b$, and Pearson correlation $R^2$.
     * **Exponential Regression ($y = A e^{Bx}$):** Computes exponential amplitude $A$, decay/growth rate $B$, and $R^2$.
  3. View the high-DPI scatter plot and analytical fit curve directly inside the browser.

---

## 5. The Optional Socratic AI Tutor (bring your own key)

> **Disclaimer: AI is optional.** All simulations, instruments, the lab notebook and CSV export work fully without any AI. The tutor connects to a third-party provider (Google Gemini) using your own account and API key, and your use is governed by that provider's terms, including age and regional requirements, which vary by provider and location. Read [Google's Gemini API terms](https://ai.google.dev/gemini-api/terms) before creating a key. Use only services you are allowed to use. If you need permission from a parent, teacher or institution to use an AI service, get it first, and follow the rules that apply to you: many schools, colleges and employers restrict generative AI.

### 5.1 Getting a Gemini API Key
1. Go to **[Google AI Studio → API Keys](https://aistudio.google.com/apikey)** and sign in with a Google account.
2. Click **Create API key**. AI Studio creates a Google Cloud project for you if you don't have one. Available plans, pricing and usage limits are set by Google and may change; see [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing).
3. Copy the key. Treat it like a password: don't paste it into chats, screenshots or shared documents.

> **Key notes:** The tutor uses the `gemini-3.8-flash` model. Depending on your plan, Google may use your prompts to improve its products; check Google's terms. Keys created since May 2026 are restricted to the Gemini API by default; if an older key is rejected, create a new one. If a key leaks, delete it in AI Studio and create another.

### 5.2 Setting Up Your API Key
1. Click the **AI Tutor** tab on the right edge of the screen to slide out the drawer.
2. Paste your **Google Gemini API Key**.
3. Click **Save Key**. 
   > **Privacy Notice:** Your API key is saved only in your browser's local storage (`localStorage`). When you use the tutor, your key, your messages and your simulation telemetry are sent directly to Google's Gemini endpoint; Agentuto has no servers of its own and sees none of it.

> **Troubleshooting:** If the tutor says the Gemini model "may have been retired", Google has shut down the model Agentuto calls. Your key is fine; the app needs an update. Please report it on the project's GitHub issues.

### 5.3 Socratic Interaction Principles
The Agentuto Tutor is instructed to follow strict pedagogical rules (AI models can still make mistakes, so check their reasoning):
* It is told **not** to calculate final numerical answers for you.
* It reads your **live simulation telemetry** (current position, speeds, damping factors, and slider settings) and asks probing questions to help you discover physical laws independently.
* If you ask *"What is the answer?"*, it will point you to specific variables in your telemetry or suggest adjusting a parameter to observe the consequence.

## 6. Machine Requirements and What Happens Without a GPU

Agentuto needs **no GPU for most of what it does**. Twelve of the seventeen sandboxes draw to a plain 2D
canvas, and every engine, instrument, notebook and CSV export runs on the CPU. Only the 3D views need
WebGL — and if your machine cannot provide it, the app tells you instead of failing silently.

### 6.1 What needs WebGL

| Needs WebGL (Three.js) | Runs on a 2D canvas, no GPU required |
|---|---|
| `lorentz-force` | `harmonic-oscillator` |
| `lorenz-attractor` | `maxwell-boltzmann` |
| `faraday-induction` | `quantum-tunneling` |
| `kepler-orbits` | `wave-optics` |
| `gauss-flux` | `projectile-drag`, `lcr-circuit`, `standing-waves`, `doppler-shift`, `photoelectric-effect`, `carnot-cycle`, `conservation-momentum`, `rc-rl-circuits` |

### 6.2 If your machine has no usable WebGL

This is more common than it sounds: hardware acceleration switched off in the browser, an older integrated
GPU, a virtual machine or remote-desktop session, a locked-down browser policy, or a driver that refuses to
create a context.

What you will see:

* The app **opens on a 2D sandbox** instead of a 3D one, so you land on something that runs.
* In the module catalogue, 3D entries carry a **`needs WebGL`** badge.
* If you open one anyway, the viewport explains what could not be created and offers **four 2D sandboxes** one click away. It does not go black and it does not go blank.
* **Nothing else changes**: sliders, telemetry, the caliper, the photogate, the lab notebook, regression and CSV export all keep working.

What you can do: pick one of the 2D sandboxes, or re-enable hardware acceleration in your browser settings
and reload the page.

### 6.3 If a sandbox fails to start for any other reason

You get the error message with **Reload** and **Try again** buttons rather than a white screen. If it keeps
happening, please open an issue on the project's GitHub issues with the message text and your browser
version — that is far more useful than a screenshot of a blank page.
