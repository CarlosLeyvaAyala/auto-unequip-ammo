import { printConsole, on, Game } from "skyrimPlatform"

export let main = () => {
  printConsole("Auto (un)equip ammo successfully initalized")

  on("equip", (e) => {
    const pl = Game.getPlayer()
    if (e.actor.getFormID() !== pl?.getFormID()) return
    const b = e.actor.getBaseObject()
    // if (b) printConsole(`EQUIP. actor: ${b.getName()}. object: ${e.baseObj.getName()}`);
  })

  // on("unequip", (e) => {
  //   const b = e.actor.getBaseObject()
  //   // if (b) printConsole(`UNEQUIP. actor: ${b.getName()}. object: ${e.baseObj.getName()}`);
  // });
}
