<script context="module" lang="ts">
  import './app.css'

  import { PixiJSGrid } from './lib/Grid'
  import * as Matter from 'matter-js'
  import * as Pixi from 'pixi.js'
  import { Hole } from './lib/Hole'
  import { Plank } from './lib/Plank'
  import { SCREW_RADIUS } from './lib/constants'

  export class Game {
    engine!: Matter.Engine
    render!: Matter.Render
    canvas!: HTMLCanvasElement
    app!: Pixi.Application

    selected: Hole | null = null

    mode: 'screw' | 'select' | 'toggle' | 'plank' = 'plank'

    holes: Hole[] = []
    planks: Plank[] = []

    async init(canvas: HTMLCanvasElement) {
      // @ts-expect-error
      window.game = this

      await this.initGraphics(canvas)
      this.initPhysics()

      this.holes = []
      this.planks = []
    }

    initPhysics() {
      this.engine = Matter.Engine.create()
    }

    async initGraphics(canvas: HTMLCanvasElement) {
      this.canvas = canvas
      this.app = new Pixi.Application()
      await this.app.init({
        canvas: this.canvas,
        width: 1290 * 0.4,
        height: 2796 * 0.4,
        backgroundColor: 'black'
      })
    }

    createGrid() {
      const g = new Pixi.Graphics().setStrokeStyle({ color: 'white', width: 2 })
      g.position.set(0, 0)

      for (let i = 0; i <= this.app.canvas.height / SCREW_RADIUS / 2; i += 1) {
        const startCoord = i * SCREW_RADIUS * 2

        // draw the column
        g.moveTo(startCoord, 0)
        g.lineTo(startCoord, this.app.canvas.height)

        // draw the row
        g.moveTo(0, startCoord)
        g.lineTo(this.app.canvas.width, startCoord)
      }
      g.endFill()

      this.app.stage.addChild(g)
    }

    run() {
      this.createGrid()
      this.app.ticker.add((time) => {
        Matter.Engine.update(this.engine, time.deltaMS)
        for (const plank of this.planks) {
          plank.body.rotation = plank.rb.angle
          plank.body.position.set(plank.rb.position.x, plank.rb.position.y)
        }
      })
    }

    snapToGrid(x: number, y: number) {
      return Matter.Vector.create(
        Math.round(x / (2 * SCREW_RADIUS)) * 2 * SCREW_RADIUS,
        Math.round(y / (2 * SCREW_RADIUS)) * 2 * SCREW_RADIUS
      )
    }

    onEditorToggle(event: MouseEvent) {
      const pos = this.snapToGrid(event.offsetX, event.offsetY)
      const allBodies = Matter.Composite.allBodies(this.engine.world)
      const queriedBodies = Matter.Query.point(allBodies, pos)

      let holeBody = queriedBodies.filter((body) => body.label === 'hole')[0]
      const index = this.holes.findIndex((hole) => hole.rb === holeBody)
      if (index === -1) {
        console.log(pos)
        const hole = new Hole(pos.x, pos.y, 'empty')
        this.holes.push(hole)
        Matter.World.add(this.engine.world, hole.rb)
      } else {
        this.holes[index].destroy()
        this.holes.splice(index, 1)
      }
    }

    onEditorScrew(event: MouseEvent) {
      const pos = this.snapToGrid(event.offsetX, event.offsetY)
      const allBodies = Matter.Composite.allBodies(this.engine.world)
      const queriedBodies = Matter.Query.point(allBodies, pos)

      let holeBody = queriedBodies.filter((body) => body.label === 'hole')[0]
      if (!holeBody) return

      const hole = this.holes.find((hole) => hole.rb === holeBody)!
      hole.setState('filled')
    }

    onSelect(event: MouseEvent) {
      const pos = this.snapToGrid(event.offsetX, event.offsetY)
      const allBodies = Matter.Composite.allBodies(this.engine.world)
      const queriedBodies = Matter.Query.point(allBodies, pos)
      let holeBody = queriedBodies.filter((body) => body.label === 'hole')[0]
      if (!holeBody) return

      let plankBodies = queriedBodies.filter((body) => body.label === 'plank')

      const planks = plankBodies.map((body) => this.planks.find((plank) => plank.rb === body)!)
      const hole = this.holes.find((hole) => hole.rb === holeBody)
      if (!hole) return
      if (hole === this.selected) {
        // select/deselect toggle
        hole.setState('filled')
        this.selected = null
        return
      }
      if (hole.state === 'empty' && this.selected) {
        // screw
        this.selected.setState('empty')
        this.selected.detachAll()
        hole.attachAll(planks)
        this.selected = null
      } else if (hole.state === 'filled') {
        if (this.selected) {
          this.selected.setState('filled')
          return
        }
        hole.setState('selected')
        this.selected = hole
      }
    }

    currPlank: Plank | null = null

    onEditorPlank(event: MouseEvent) {
      const pos = this.snapToGrid(event.offsetX, event.offsetY)

      if (event.type === 'mousedown') {
        this.currPlank = new Plank(pos, pos)
        return
      }

      if (event.type === 'mousemove' && event.buttons === 1) {
        if (!this.currPlank) return
        this.currPlank.setEndPos(pos)
        return
      }

      if (event.type === 'mouseup') {
        this.currPlank?.create()
        this.planks.push(this.currPlank!)
        this.currPlank = null
      }
    }

    onMouseUp(event: MouseEvent) {
      if (this.mode === 'toggle') {
        return this.onEditorToggle(event)
      } else if (this.mode === 'screw') {
        return this.onEditorScrew(event)
      } else if (this.mode === 'select') {
        return this.onSelect(event)
      } else if (this.mode === 'plank') {
        return this.onEditorPlank(event)
      }
    }

    onMouseDown(event: MouseEvent) {
      if (this.mode === 'plank') {
        return this.onEditorPlank(event)
      }
    }

    onMouseMove(event: MouseEvent) {
      if (this.mode === 'plank') {
        return this.onEditorPlank(event)
      }
      // console.log(event.offsetX, event.offsetY)
    }
  }

  export const game = new Game()
</script>

<script lang="ts">
  import { onMount } from 'svelte'

  let canvas: HTMLCanvasElement
  onMount(async () => {
    await game.init(canvas)
    game.run()
  })
</script>

<main>
  <div>
    <p>Current mode: {game.mode}</p>
    <button on:click={() => (game.mode = 'screw')}>Screw</button>
    <button on:click={() => (game.mode = 'plank')}>Plank</button>
    <button on:click={() => (game.mode = 'select')}>Select</button>
    <button on:click={() => (game.mode = 'toggle')}>Toggle</button>
  </div>
  <canvas
    bind:this={canvas}
    on:mouseup={game.onMouseUp.bind(game)}
    on:mousemove={game.onMouseMove.bind(game)}
    on:mousedown={game.onMouseDown.bind(game)}
  />
</main>

<style>
  canvas {
    display: block;
    margin: 0 auto;
  }
</style>
