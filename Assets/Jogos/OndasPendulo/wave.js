console.clear()

// =======================================================
// UI ====================================================
// =======================================================
let C = {
  play: true,
  numBalls: 15,
  angleIncrement: 0.05,
  startPeriod: 4,
  endPeriod: 3,
  ballSize: 10,
  ballAlpha: 1,
  waveColor: {r:0, g:223, b:252},
  blipFadeTime: 200,
  colorEffect: false,
  sizeEffect: false,
  ballLinesEnabled: true,
  sideLinesEnabled: true,
  root: 48,
  scalePreset: 'pentatônica menor',
  scale: '0 3 5 7 10',
  noteDuration: 100,
  velocity: 80,
  midiOutputPort: '',
  bothSidesTrigger: true,
  pEnabled: true,
  pLifeTime: 30,
  pStartSize: 20,
  pEndSize: 40,
  pLeftColor: { r: 255, g: 146, b: 86 },
  pRightColor: { r: 255, g: 106, b: 123 },
  pStartAlpha: 255,
  synthEnabled: true,
  releaseTime: 0.2,
  volume: -12,
  backgroundColor: {r:30, g:30, b:30}
}

let scaleMenu = {
  'acorde maior': '0 4 7',
  'acorde menor': '0 3 7',
  'acorde maior 7': '0 4 7 11',
  'acorde menor 7': '0 3 7 10',
  'acorde dom 7': '0 4 7 10',
  'escala maior': '0 2 4 5 7 9 11',
  'escala menor': '0 2 3 5 7 8 10',
  'pentatônica maior': '0 2 4 7 9',
  'pentatônica menor': '0 3 5 7 10'
}

let gui = new dat.GUI()

let waveControls = gui.addFolder('Controle de Ondas')
waveControls.open()
waveControls.add(C, 'play')
waveControls.add({ fun: function() {
  wave.init()
}}, 'fun').name('reiniciar')
waveControls.add(C, 'numBalls').name('número de bolas').onChange(initWave)
waveControls.add(C, 'startPeriod').name('período alto').onChange(setVelocities)
waveControls.add(C, 'endPeriod').name('período baixo').onChange(setVelocities)

let waveVisualControls = gui.addFolder('Estilo de Onda')
// waveVisualControls.open()
waveVisualControls.add(C, 'ballSize', 1, 1000, 1).name('tamanho da bola')
waveVisualControls.add(C, 'ballAlpha', 0, 1, 0.01).name('alfa da bola')
waveVisualControls.add(C, 'ballLinesEnabled').name('mostrar linhas internas')
waveVisualControls.add(C, 'sideLinesEnabled').name('mostrar linhas laterais')
waveVisualControls.addColor(C, 'waveColor').name('cor da onda')
waveVisualControls.addColor(C, 'backgroundColor').name('cor de fundo')

let noteControls = gui.addFolder('Notas')
noteControls.open()
noteControls.add(C, 'bothSidesTrigger').name('ativar ambos os lados')
noteControls.add(C, 'root', 1, 127, 1).onFinishChange(setMidiNotes)

noteControls.add(C, 'scale').onFinishChange(setMidiNotes).listen()  // listen() atualiza a UI se mudarmos C.scale dentro do código
noteControls.add(C, 'scalePreset', scaleMenu).onFinishChange(scaleMenuSelected)



let particleControls = gui.addFolder('Partículas')
particleControls.add(C, 'pEnabled').name('ativado')
particleControls.add(C, 'pLifeTime').name('tempo de vida')
particleControls.add(C, 'pStartSize').name('tamanho inicial')
particleControls.add(C, 'pEndSize').name('tamanho final')
particleControls.addColor(C, 'pLeftColor').name('cor da esquerda')
particleControls.addColor(C, 'pRightColor').name('cor da direita')
particleControls.add(C, 'pStartAlpha', 0, 255, 1).name('alfa inicial')


let midiControls = gui.addFolder('MIDI')
// midiControls.open()
let portController = midiControls.add(C, 'midiOutputPort').name('porta').onChange(setMidiPort)
midiControls.add(C, 'noteDuration').name('duração da nota (ms)')
midiControls.add(C, 'velocity', 1, 127, 1)


let synthControls = gui.addFolder('Sintetizador')
synthControls.open()
synthControls.add(C, 'synthEnabled').name('ativado').onChange(startToneAudio)
synthControls.add(C, 'releaseTime').name('tempo de liberação')
synthControls.add(C, 'volume', -36, 0, 1).name('volume (dB)').onChange(setSynthVolume)



// let effectControls = gui.addFolder('Outros Efeitos')
// effectControls.open()
// effectControls.addColor(C, 'backgroundColor').name('cor de fundo')

// effectControls.add(C, 'colorEffect').name('efeito de cor blip/fade')
// effectControls.add(C, 'sizeEffect').name('efeito de tamanho blip/fade')
// effectControls.add(C, 'blipFadeTime').name('comprimento do blip/fade')

// waveControls.add(C, 'baseFrequency', 0, .2).name('frequência base').onChange(setVelocities)
// waveControls.add(C, 'frequencyOffset').name('deslocamento de frequência').onChange(setVelocities)


// ================================================================
// Classe de Bola =====================================================
// ================================================================
class Bola {
  constructor() {
    this.x = 0
    this.y = 0
    
    this.angle = 0
    this.angleVelocity = 0.05
    
    this.id = 0
    this.state = 'subindo'
    
    this.corPadrao = color(255)
    this.timer = new Temporizador(C.blipFadeTime)
    this.corEsquerda = color(255, 0, 0)
    this.corDireita = color(0, 255, 255)
    this.triggerColor = this.corPadrao
  }
  
  atualizar() {
    if (C.play) {
      this.angle += this.angleVelocity
    }
  }
  
  verificarGatilho() {
    let nota = midiNotas[midiNotas.length - 1 - this.id]
    let velocidade = floor(C.velocity * 127)

    // LADO DIREITO ============================
    if (this.state === 'subindo') {
      if (this.x > waveWidth - 1) {
        
        if (C.bothSidesTrigger) {     
          // tocar midi
          if (nota >= 0 && nota <= 127 && midiOutput) {
            midiOutput.playNote(nota, 1, {duration: C.noteDuration, velocity: velocidade})
          }
          
          // tocar sintetizador
          if (C.synthEnabled) {
            let notaTone = Tone.Frequency(nota, 'midi')
            synthDireito.triggerAttackRelease(notaTone, C.releaseTime)
          }
          
          // triggerFade('right')
          this.triggerColor = this.corDireita
          this.timer.start()
          
          if (C.pEnabled) {
            partículas.push(new Partícula(this.x, this.y, 'direita'))
          }
        }
        
        this.state = 'descendo'
      }
    }
    
    // LADO ESQUERDO ============================
    if (this.state === 'descendo') {
      if (this.x < -waveWidth + 1) {
        // tocar midi
        if (nota >= 0 && nota <= 127 && midiOutput) {
          midiOutput.playNote(nota, 2, {duration: C.noteDuration, velocity: velocidade})
        }

        // tocar sintetizador
        if (C.synthEnabled) {
          let notaTone = Tone.Frequency(nota, 'midi')
          synthEsquerdo.triggerAttackRelease(notaTone, C.releaseTime)
        }
        
        
        // triggerFade('left')
        this.triggerColor = this.corEsquerda
        this.timer.start()
        
        if (C.pEnabled) {
          partículas.push(new Partícula(this.x, this.y, 'esquerda'))
        }
        
        this.state = 'subindo'
      }
    }
  }
  
  desenhar() {
    let r, g, b
    ({r, g, b} = C.waveColor)
    this.corPadrao = color(r, g, b)
    
    let normalizado = 1 - this.timer.currentTime / this.timer.duration
    // normalizado = 1

    let tamanhoDesenho
    if (C.sizeEffect) {
      tamanhoDesenho = lerp(C.ballSize, C.ballSize + 20, normalizado)
    }
    else {
      tamanhoDesenho = C.ballSize
    }
    
    let corDesenho 
    if (C.colorEffect) {
      
      corDesenho = lerpColor(this.corPadrao, this.triggerColor, normalizado)
    }
    else {
      corDesenho = this.corPadrao
    }
    
    if (C.ballLinesEnabled) {
      let r, g, b
      ({r, g, b} = C.waveColor)
      stroke(color(r, g, b), 150)
      line(0, this.y, this.x, this.y)
    }
    
    noStroke()
    corDesenho.setAlpha(C.ballAlpha * 255)
    fill(corDesenho)

    // let x = sin(this.angle)
    // this.x = map(x, -1, 1, -waveWidth, waveWidth)
    
    circle(this.x, this.y, tamanhoDesenho)
  }
}

// =========================================================
// Classe de Onda ==============================================
// =========================================================
class Onda {
  constructor({numBolas = C.numBalls} = {}) {
    this.numBolas = numBolas
    this.bolas = []
    
    this.init()
  }
  
  init() {
    this.bolas = Array.from(Array(this.numBolas), (_, i) => {
      let bola = new Bola()
      
      bola.id = i
      bola.y = map(i, 0, this.numBolas-1, -waveHeight, waveHeight)
      
      // bola.angleVelocity = random(-0.1, 0.1)
      bola.angle = 0
      // bola.angleVelocity = C.baseFrequency + (i / C.frequencyOffset)
      
      
      return bola
    })
    
    this.setVelocities()
  }
  
  reset() {
    this.bolas.forEach(bola => bola.angle = 0)
  }
  
  setVelocities() {
    let startAngleV = TWO_PI_OVER_60 / C.startPeriod
    let endAngleV = TWO_PI_OVER_60 / C.endPeriod
  
    this.bolas.forEach((bola,i) => {
      // bola.angleVelocity = C.baseFrequency + (i / C.frequencyOffset)   // old version

      bola.angleVelocity = map(i, 0, this.bolas.length-1, startAngleV, endAngleV)
    })
  }
  
  render() {
    this.bolas.forEach(bola => {
      if (C.play) {
        
        let x = sin(bola.angle)
        bola.x = map(x, -1, 1, -waveWidth, waveWidth)
        
        bola.angle += bola.angleVelocity
      }
      
      bola.verificarGatilho()
      bola.desenhar()
    })
  }
}

// ================================================
// p5 =============================================
// ================================================

let onda
let waveWidth
let waveHeight
const TWO_PI_OVER_60 = 2 * Math.PI / 60

let midiOutput
let midiNotas = []

let partículas = []

let panVolEsquerdo, panVolDireito
let synthEsquerdo, synthDireito

function setup() {
  let cnv = createCanvas(windowWidth, windowHeight)
  cnv.style('display', 'block')
  
  waveWidth = 300
  waveHeight = 300
  
  setMidiNotes()
  
  setupSynths()
  
  onda = new Onda()
}

function draw() {
  let r, g, b
  ({r, g, b} = C.backgroundColor)
  background(color(r, g, b))
  
  translate(width/2, height/2)
  
  // desenhar linhas laterais
  if (C.sideLinesEnabled) {
    stroke(255)
    line(-waveWidth, -waveHeight, -waveWidth, waveHeight)
    line(waveWidth, -waveHeight, waveWidth, waveHeight)
  }
  
  // onda
  onda.render()
    
  // partículas
  partículas = partículas.filter(p => p.estaViva())

  partículas.forEach(p => {
    p.atualizar()
    p.desenhar()
  })  
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight)
}

function mousePressed() {
  
}

// =======================================================
// =======================================================
// =======================================================
function initWave() {
  onda = new Onda({numBolas: C.numBalls})
  setMidiNotes()
}

function setMidiNotes() {
  // converter string UI de intervalos para array de números
  let intervalosEscala = C.scale.split(' ').map(str => Number(str))
  
  midiNotas = []
  for (let i = 0; i < C.numBalls; i++) {
    let oitava = floor(i / intervalosEscala.length)
    
    midiNotas[i] = C.root + intervalosEscala[i % intervalosEscala.length] + (oitava * 12)
  }
}

function scaleMenuSelected() {
  console.log(C.scalePreset)

  C.scale = C.scalePreset
  setMidiNotes()
}

function setMidiPort() {
  console.log('olá')
  midiOutput = WebMidi.getOutputByName(C.midiOutputPort)
  console.log("WebMidi conectado.", midiOutput.name)
}

function setVelocities() {
  onda.setVelocities()
}

function startToneAudio() {
  // console.log('tone started')
  Tone.start()
}

function setSynthVolume() {
  panVolEsquerdo.volume.value = C.volume
  panVolDireito.volume.value = C.volume
}

function setupSynths() {
  Tone.start()
  
  panVolEsquerdo = new Tone.PanVol(-1, C.volume).toDestination()
  panVolDireito = new Tone.PanVol(1,  C.volume).toDestination()
  
  synthEsquerdo = new Tone.PolySynth(Tone.Synth).connect(panVolEsquerdo)
  synthDireito = new Tone.PolySynth(Tone.Synth).connect(panVolDireito)
  
  
  synthEsquerdo.set({
    oscillator: {
      type: 'sine'
    },
    envelope: {
      attack: 0.001
    }
  })
  
  synthDireito.set({
    oscillator: {
      type: 'sine'
    },
    envelope: {
      attack: 0.001
    }
  })
}

// =======================================================
// WebMidi ===============================================
// =======================================================
WebMidi.enable(err => {
  if (err) {
    console.log("WebMidi não pôde ser ativado.", err)
  }
  else {
    let nomesPorta = [...WebMidi.outputs].map(output => output.name)  // copiar array de portas e transformá-lo em seus nomes
    portController.options(nomesPorta).setValue(nomesPorta[0]).name('porta').onChange(setMidiPort)
    midiOutput = WebMidi.outputs[0] 
    if (midiOutput) {
      console.log(`WebMidi conectado a ${midiOutput.name}`, midiOutput.name)
    } else {
      console.log("Nenhuma saída midi encontrada.")
    }
  }
})

// ==========================================================
// Partícula  ================================================
// ==========================================================
class Partícula {
  constructor(x, y, lado) {
    this.pos = createVector(x, y)
    
    let r, g, b
    if (lado === 'esquerda') {
      ({r, g, b} = C.pLeftColor)
    }
    else if (lado === 'direita') {
      ({r, g, b} = C.pRightColor)
    }
    this.color = color(r, g, b)
    
    this.startSize = C.pStartSize
    this.endSize = C.pEndSize
    
    this.startAlpha = C.pStartAlpha
    
    this.estaMorta = false
    this.vida = C.pLifeTime
    this.tempoVida = C.pLifeTime
  }
  
  estaViva() {
    return this.vida > 0
  }
  
  atualizar() {
    this.vida -= 1
    this.vida = constrain(this.vida, 0, this.tempoVida)
  }
  
  desenhar() {
    let _alfa = map(this.vida, this.tempoVida, 0, this.startAlpha, 0)
    // _alfa = 150
    
    let tamanhoDesenho = map(this.vida, this.tempoVida, 0, this.startSize, this.endSize)
    
    noStroke()
    // fill(255, _alfa)
    this.color.setAlpha(_alfa)
    fill(this.color)
    // noFill()
    // stroke(255, _alfa)
    
    let larguraLinha = 50
    
    circle(this.pos.x, this.pos.y, tamanhoDesenho)
    
    // strokeCap(SQUARE)
    // strokeWeight(2)
    // stroke(this.color)
    // line(this.pos.x - larguraLinha, this.pos.y, this.pos.x + larguraLinha, this.pos.y)
  }
}

// ========================================
// Temporizador ==================================
// ========================================

class Temporizador {
  constructor(duração = 1) {
    this.horaInicial = 0
    this.duração = duração
    this.tempoDecorrido = 0
    this.estáRodando = false
  }
  
  start() {
    this.horaInicial = millis()
    this.estáRodando = true
  }
  
  get currentTime() {
    if (this.estáRodando) {
      this.tempoDecorrido = millis() - this.horaInicial
      this.tempoDecorrido = constrain(this.tempoDecorrido, 0, this.duração)

      if (this.tempoDecorrido === this.duração) {
        this.estáRodando = false
      }
    }
    
    return this.tempoDecorrido
  }
}
