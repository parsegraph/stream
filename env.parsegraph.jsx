import React, {useEffect, useState} from 'react'
import process from 'process'
import { readFileSync, writeFileSync } from 'fs';

const Slot = ({dir, value, setValue})=>{
  const [editing, setEditing] = useState(false);
  console.log("SLOT")
  return <parsegraph dir={dir} type="b" label={value} onClick={()=>{
    setEditing(!editing);
  }}>
    {editing && typeof value === "number" && <parsegraph type="u" dir="f" label="+" onClick={()=>setValue(value + 1)}/>}
    {editing && typeof value === "number" && <parsegraph type="u" dir="b" label="-" onClick={()=>setValue(value - 1)}/>}
  </parsegraph>
}

const Multislot = ({dir, list, onPrepend, onAppend, onUpdate, onRemove, render})=>{
  return <parsegraph dir={dir} type="u" pull="d" onClick={onPrepend}>
  {[...list].reverse().reduce((children, item, index)=>(
    <parsegraph dir="forward" type="u" pull="d" onClick={()=>{
      onRemove(list.length - 1 - index);
    }}>
      {render ? render(item, list.length - 1 - index) : <Slot dir="d" value={item} setValue={(newVal)=>{
        onUpdate(list.length - 1 - index, newVal);
      }}/>}
      {children}
      {index === 0 ? <parsegraph dir='f' type='u' onClick={onAppend}/> : null}
    </parsegraph>
  ), null)}
  </parsegraph>
}

const Page = ()=>{
  const dataPath = __filename + ".json"
  let parsedData
  try {
    parsedData = JSON.parse(readFileSync(dataPath))
  } catch (ex) {
    console.warn(ex)
  }
  const [elems, setElems] = useState(parsedData)

  useEffect(()=>{
    writeFileSync(__filename + ".json", JSON.stringify(elems))
  }, [elems])
  return <Multislot list={elems}
  onUpdate={(index, newVal)=>{
    const newElems = [...elems]
    newElems[index] = newVal;
    setElems(newElems)
  }}
  onPrepend={()=>{
    setElems([elems.length, ...elems])
  }}
  onAppend={()=>{
    setElems([...elems, elems.length])
  }}
  onRemove={(index)=>{
    const newElems = [...elems]
    newElems.splice(index, 1)
    setElems(newElems)
  }}/>
}

module.exports = {
  default: () => {
    return <Page/>
  }
}