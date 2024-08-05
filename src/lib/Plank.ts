import * as Matter from 'matter-js'
import * as Pixi from 'pixi.js'

import { FILLED_GROUP, PLANK_THICKNESS, SCALE, SCREW_RADIUS } from './constants'
import { game } from '../Game.svelte'
import type { Hole } from './Hole'

export class Plank {
  body: Pixi.Graphics
  length: number
  // slots: number[]
  rb: Matter.Body

  get slotsCount() {
    return this.length / SCREW_RADIUS / 2
  }

  isSlotAvailable(hole: Hole, idx: number) {
    const dir = Matter.Vector.sub(hole.rb.position, this.getWorldSlotPosition(idx))
    const dist = Matter.Vector.magnitude(dir)
    return hole.state === 'empty' && dist <= SCREW_RADIUS / 4
  }

  constructor(x: number, y: number, length: number) {
    this.length = length
    // this.slots = slots
    this.rb = Matter.Bodies.rectangle(x, y, length, PLANK_THICKNESS, {
      label: 'plank',
      friction: 0,
      collisionFilter: { group: FILLED_GROUP }
    })
    Matter.World.add(game.engine.world, this.rb)

    this.body = new Pixi.Graphics()
      .rect(-length / 2, -PLANK_THICKNESS / 2, length, PLANK_THICKNESS)
      .fill('rgba(255, 255, 255, 0.5)')
    this.body.position.set(x, y)
    for (let i = 0; i < this.slotsCount; i++) {
      const circle = new Pixi.Graphics().circle(0, 0, SCREW_RADIUS * 0.2).fill('green')
      circle.position.set(this.getLocalSlotPosition(i).x, 0)
      this.body.addChild(circle)
    }
    game.app.stage.addChild(this.body)

    game.app.ticker.add(() => {
      for (let i = 0; i < this.slotsCount; i++) {
        const hasCloseHole = game.holes.some((hole) => this.isSlotAvailable(hole, i))
        const child = this.body.getChildAt(i) as Pixi.Graphics

        child
          .clear()
          .circle(0, 0, SCREW_RADIUS * 0.2)
          .fill(hasCloseHole ? 'green' : 'red')
      }
    })
  }

  getLocalSlotPosition(idx: number) {
    const offset = -this.length / 2 + SCREW_RADIUS
    return Matter.Vector.create(offset + idx * SCREW_RADIUS * 2, 0)
  }

  getWorldSlotPosition(idx: number) {
    const Vector = Matter.Vector
    let dir = Vector.create(1, 0)
    dir = Vector.rotate(dir, this.rb.angle)
    dir = Vector.mult(dir, this.getLocalSlotPosition(idx).x)
    dir = Vector.add(dir, this.rb.position)
    return dir
  }
}
