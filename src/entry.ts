import { DebugLib as D } from "DmLib"
import * as JDB from "JContainers/JDB"
import * as LibFire from "LibFire/LibFire"
import {
  Actor,
  Ammo,
  EquipEvent,
  Form,
  Game,
  on,
  printConsole,
  settings,
  Utility,
  Weapon,
  WeaponType,
} from "skyrimPlatform"

/** Internal name */
const n = "auto-unequip-ammo"

const rememberAmmo = settings[n]["rememberAmmo"] as boolean | false
const equipDelay = settings[n]["equipDelay"] as number | 0.1
const logLvl = D.Log.LevelFromSettings(n, "loggingLevel")
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

const key = ".auto-unequip"
const keyB = key + ".bow"
const keyC = key + ".crossbow"

export function main() {
  printConsole("Auto unequip ammo successfully initalized")

  on("equip", (e) => {
    StartAction("Object equipped", e, (_, i, t) => {
      if (!(IsRanged(t) && rememberAmmo)) return
      RestoreAmmo(t)
    })
  })

  const IsRanged = (t: WAType) => t === WAType.bow || t === WAType.crossbow

  on("unequip", (e) => {
    StartAction("Object unequipped", e, (p, _, t) => {
      if (!IsRanged(t)) return

      const a = LibFire.GetEquippedAmmo(Game.getPlayer())
      if (!a) return

      if (rememberAmmo) RememberAmmo(a, t)
      LogQ("Removing ammo", a)
      p.unequipItem(a, false, true)
    })
  })
}

/** Log quiver movement. */
const LogQ = (msg: string, ammo: Form) => {
  LogI(`${msg}: ${D.Log.IntToHex(ammo.getFormID())}`)
}

/** Weapon/Ammo type. */
enum WAType {
  none,
  bow,
  crossbow,
  ammo,
  other,
}

function GetWeaponType(item: Form) {
  const w = Weapon.from(item)
  if (!w) return Ammo.from(item) ? WAType.ammo : WAType.none
  if (w.getWeaponType() == WeaponType.Bow) return WAType.bow
  if (w.getWeaponType() == WeaponType.Crossbow) return WAType.crossbow
  return WAType.other
}

const GetJcKey = (w: WAType) => (w === WAType.bow ? keyB : keyC)

const RememberAmmo = (a: Ammo, w: WAType) => {
  LogQ("Remembering equipped ammo for later restoration", a)
  const k = GetJcKey(w)
  JDB.solveFormSetter(k, a, true)
}

const RestoreAmmo = (w: WAType) => {
  const k = GetJcKey(w)
  const i = JDB.solveForm(k)
  if (!i) return
  LogQ("Restoring remembered ammo", i)

  Wait(i, equipDelay ? 0.1 : equipDelay, (x) => {
    const a = Ammo.from(x)
    if (!a) return
    Game.getPlayer()?.equipItem(a, false, true)
  })
}

export function Wait(o: Form, time: number, DoSomething: (a: Form) => void) {
  const id = o.getFormID()
  const f = async () => {
    await Utility.wait(time)
    const a = Game.getFormEx(id)
    if (!a) return
    DoSomething(a)
  }
  f()
}

/** A function that accepts a player object, an item and a weapon type and returns nothing. */
type DoSomethingFunc = (player: Actor, item: Form, weaponType: WAType) => void

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
  const t = LogVT("Type is", GetWeaponType(item), (t) => WAType[t])

  DoSomething(pl, item, t)
}
