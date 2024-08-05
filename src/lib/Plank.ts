import * as Matter from 'matter-js'
import * as Pixi from 'pixi.js'

import { FILLED_GROUP, PLANK_THICKNESS, SCALE, SCREW_RADIUS } from './constants'
import { game } from '../Game.svelte'
import type { Hole } from './Hole'

export class Plank {
  body!: Pixi.Graphics
  startPos!: Matter.Vector
  endPos!: Matter.Vector
  rb!: Matter.Body

  get centerPos() {
    return Matter.Vector.add(this.startPos, Matter.Vector.mult(Matter.Vector.sub(this.endPos, this.startPos), 0.5))
  }

  get slotsCount() {
    return this.length / SCREW_RADIUS / 2
  }

  get length() {
    return Matter.Vector.magnitude(Matter.Vector.sub(this.endPos, this.startPos))
  }

  setEndPos(pos: Matter.Vector) {
    console.log('setEndPos', this.startPos, pos)
    this.endPos = pos

    if (!this.body) {
      this.body = new Pixi.Graphics()
    }

    const screenLength = this.length + SCREW_RADIUS*2
    const screenThickness = PLANK_THICKNESS

    this.body = this.body
      .clear()
      .rect(-screenLength/2, -screenThickness/2, screenLength, screenThickness)
      .fill('rgba(255, 255, 255, 0.5)')

    this.body.position.set(this.centerPos.x, this.centerPos.y)
    this.body.rotation = Matter.Vector.angle(this.startPos, this.endPos)
  }

  isSlotAvailable(hole: Hole, idx: number) {
    const dir = Matter.Vector.sub(hole.rb.position, this.getWorldSlotPosition(idx))
    const dist = Matter.Vector.magnitude(dir)
    return hole.state === 'empty' && dist <= SCREW_RADIUS / 4
  }

  create() {
    this.rb = Matter.Bodies.rectangle(this.centerPos.x, this.centerPos.y, this.length, PLANK_THICKNESS, {
      label: 'plank',
      friction: 0,
      collisionFilter: { group: FILLED_GROUP }
    })
    console.log(this.rb)
    Matter.World.add(game.engine.world, this.rb)
  }

  constructor(startPos: Matter.Vector, endPos: Matter.Vector) {
    this.startPos = startPos
    this.setEndPos(endPos)

    // for (let i = 0; i < this.slotsCount; i++) {
    //   const circle = new Pixi.Graphics().circle(0, 0, SCREW_RADIUS * 0.2).fill('green')
    //   circle.position.set(this.getLocalSlotPosition(i).x, 0)
    //   this.body.addChild(circle)
    // }
    game.app.stage.addChild(this.body)

    // game.app.ticker.add(() => {
    //   for (let i = 0; i < this.slotsCount; i++) {
    //     const hasCloseHole = game.holes.some((hole) => this.isSlotAvailable(hole, i))
    //     const child = this.body.getChildAt(i) as Pixi.Graphics

    //     child
    //       .clear()
    //       .circle(0, 0, SCREW_RADIUS * 0.2)
    //       .fill(hasCloseHole ? 'green' : 'red')
    //   }
    // })
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
