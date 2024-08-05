import Matter from 'matter-js'
import * as Pixi from 'pixi.js'
import { SCALE, SCREW_RADIUS } from './constants'
import type { Plank } from './Plank'
import { game } from '../Game.svelte'

export class Hole {
  rb: Matter.Body
  body: Pixi.Graphics
  state: 'filled' | 'empty' | 'selected' = 'empty'
  constructor(x: number, y: number, state: Hole['state'] = 'empty') {
    this.rb = Matter.Bodies.circle(x, y, SCREW_RADIUS, {
      label: 'hole',
      isStatic: true,
      friction: 0
    })
    Matter.World.add(game.engine.world, this.rb)

    this.body = new Pixi.Graphics().circle(0, 0, SCREW_RADIUS).fill('red')
    this.body.position.set(x, y)
    game.app.stage.addChild(this.body)

    this.setState(state)
  }

  setState(state: Hole['state']) {
    this.state = state

    if (state == 'filled') {
      this.body.clear().circle(0, 0, SCREW_RADIUS).fill('red')
      this.rb.collisionFilter.category = 1
    } else if (state == 'empty') {
      this.body.clear().circle(0, 0, SCREW_RADIUS).fill('transparent').stroke('red')
      this.rb.collisionFilter.category = 0
    } else if (state == 'selected') {
      this.body.clear().circle(0, 0, SCREW_RADIUS).fill('blue')
      this.rb.collisionFilter.category = 1
    }
  }

  attachAll(planks: Plank[]) {
    for (const plank of planks) {
      plank.rb.collisionFilter.group = -1
      this.rb.collisionFilter.group = -1

      for (let i = 0; i < plank.slotsCount; i++) {
        if (plank.isSlotAvailable(this, i)) {
          console.log('found spot', i, plank.getWorldSlotPosition(i))
          const constraint = Matter.Constraint.create({
            bodyA: this.rb,
            bodyB: plank.rb,
            pointB: Matter.Vector.rotate(plank.getLocalSlotPosition(i), plank.rb.angle),
            length: 0,
            stiffness: 0.5
          })

          Matter.World.add(game.engine.world, constraint)
          break
        }
      }
    }
    this.setState('filled')
  }

  detachAll() {
    for (const constraint of game.engine.world.constraints) {
      if (constraint.bodyA === this.rb || constraint.bodyB === this.rb) {
        Matter.Composite.remove(game.engine.world, constraint)
      }
    }
  }

  destroy() {
    game.app.stage.removeChild(this.body)
    Matter.World.remove(game.engine.world, this.rb)
  }
}
