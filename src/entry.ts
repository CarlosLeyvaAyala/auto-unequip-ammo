import { DebugLib as D } from "DmLib"
import * as JDB from "JContainers/JDB"
import * as StorageUtil from "PapyrusUtil/StorageUtil"
import {
  Actor,
  Ammo,
  EquipEvent,
  Form,
  Game,
  on,
  printConsole,
  SlotMask,
  Weapon,
} from "skyrimPlatform"

/** Internal name */
const logLvl = D.Log.LevelFromSettings("auto-unequip-ammo", "loggingLevel")
printConsole(`Auto unequip ammo logging level: ${D.Log.Level[logLvl]}`)

// Generates a logging function specific to this mod.
const CLF = (logAt: D.Log.Level) =>
  D.Log.CreateFunction(
    logLvl,
    logAt,
    "Auto unequip ammo",
    D.Log.ConsoleFmt,
    D.Log.FileFmt
  )

/** Logs messages intended to detect bottlenecks. */
const LogO = CLF(D.Log.Level.optimization)

/** Logs an error message. */
const LogE = CLF(D.Log.Level.error)

/** Logs detailed info meant for players to see. */
const LogI = CLF(D.Log.Level.info)

/** Logs a variable while initializing it. Message level: info. */
const LogIT = D.Log.Tap(LogI)

/** Logs detailed info meant only for debugging. */
const LogV = CLF(D.Log.Level.verbose)

/** Logs a variable while initializing it. Message level: verbose. */
const LogVT = D.Log.Tap(LogV)

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
    const t = LogVT("Type is", GetWeaponType(item), (t) => WeaponType[t])

    DoSomething(pl, item, t)
  }

  const key = ".auto-uneqip"

  /** Log quiver movement. */
  const LogQ = (msg: string, ammo: Form) => {
    LogI(`${msg}: ${D.Log.IntToHex(ammo.getFormID())}`)
  }

  on("equip", (e) => {
    StartAction("Object equipped", e, (_, i, t) => {
      if (t !== WeaponType.ammo) return
      LogQ("Remembering equipped ammo", i)
      JDB.solveFormSetter(key, i, true)
    })
  })

  on("unequip", (e) => {
    StartAction("Object unequipped", e, (p, _, t) => {
      if (t === WeaponType.bow || t === WeaponType.crossbow) {
        const c = JDB.solveForm(key)
        if (!c) {
          LogE("Current ammo was lost. Did you modify esp files between saves?")
          return
        }
        LogQ("Removing remembered ammo", c)
        p.unequipItem(c, false, true)
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
