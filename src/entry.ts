import * as D from "DM-Lib/Debug"
import * as JDB from "JContainers/JDB"
import {
  Actor,
  Ammo,
  EquipEvent,
  Form,
  Game,
  on,
  printConsole,
  Weapon,
} from "skyrimPlatform"

/** Internal name */
// const mod_name = "easy-containers"

// Generates a logging function specific to this mod.
const CLF = (logAt: D.LoggingLevel) =>
  D.CreateLoggingFunction(
    "Auto unequip ammo",
    D.LoggingLevel.none,
    // D.ReadLoggingFromSettings(mod_name, "loggingLevel"),
    logAt
  )

/** Logs messages intended to detect bottlenecks. */
const LogO = CLF(D.LoggingLevel.optimization)

/** Logs an error message. */
const LogE = CLF(D.LoggingLevel.error)

/** Logs detailed info meant for players to see. */
const LogI = CLF(D.LoggingLevel.info)

/** Logs detailed info meant only for debugging. */
const LogV = CLF(D.LoggingLevel.verbose)

/** Logs a variable while initializing it. Message level: verbose. */
const LogVT = D.TapLog(LogV)

export function main() {
  printConsole("Auto unequip ammo successfully initalized")

  /** Current ammo FormId.
   * @Remarks
   * Object id needs to be saved instead of the Ammo itself because object pointers in Skyrim Platform
   * expire after some time.
   */
  let currentAmmo: number

  /** A function that accepts a player object, an item and a weapon type and returns nothing. */
  type DoSomethingFunc = (
    player: Actor,
    item: Form,
    weaponType: WeaponType
  ) => void

  /**
   * Does something when player (un)equips an item.
   * @param logMsg Message to log to console.
   * @param e Event variable that contains the data to work with
   * @param DoSomething Function to execute once all data is gathered.
   * @returns void
   */
  function StartAction(
    logMsg: string,
    e: EquipEvent,
    DoSomething: DoSomethingFunc
  ) {
    // Exit if actor isn't player
    const pl = Game.getPlayer()
    if (e.actor.getFormID() !== pl?.getFormID()) return

    // Get (un)equipped object type
    const item = e.baseObj
    LogV(`${logMsg}: ${item.getName()}`)
    const t = LogVT("Type is", GetWeaponType(item))

    DoSomething(pl, item, t)
  }

  const key = ".auto-uneqip"

  on("equip", (e) => {
    StartAction("Object equipped", e, (_, i, t) => {
      if (t === WeaponType.ammo)
        currentAmmo = LogVT(
          "Remembering equipped ammo",
          (Ammo.from(i) as Ammo).getFormID(),
          D.IntToHex
        )
      JDB.solveIntSetter(key, currentAmmo, true)
    })
  })

  on("unequip", (e) => {
    StartAction("Object unequipped", e, (p, _, t) => {
      if (t === WeaponType.bow || t === WeaponType.crossbow) {
        LogI("Removing remembered ammo")
        currentAmmo = JDB.solveInt(key, 0)
        p.unequipItem(Game.getFormEx(currentAmmo), false, true)
      }
    })
  })
}

enum WeaponType {
  none,
  bow,
  crossbow,
  ammo,
  other,
}

function GetWeaponType(item: Form) {
  const w = Weapon.from(item)
  if (!w) return Ammo.from(item) ? WeaponType.ammo : WeaponType.none
  if (w.getWeaponType() == 7) return WeaponType.bow
  if (w.getWeaponType() == 9) return WeaponType.crossbow
  return WeaponType.other
}
