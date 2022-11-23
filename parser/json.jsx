import React, {useEffect, useState} from 'react'
import process from 'process'
import { readFileSync, writeFileSync } from 'fs';
const {
  parseTokens,
  tokenize,
  LispCell,
  LispType,
} = require("parsegraph-anthonylisp");


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

const IMultislot = ({dir, list, onPrepend, onAppend, onUpdate, onRemove, render})=>{
  return [...list].reverse().reduce((children, cell, indexReversed)=>{
    const index = list.length - 1 - indexReversed;
    const dir = index === 0 ? 'i' : 'f'
    if (cell.type == 2) {
      return <IMultislot dir='f' list={cell.list} render={(child)=>{
        return <Cell dir='i' cell={child}/>
      }}/>
    }
    return <parsegraph dir={dir} label={cell.val}>{children}</parsegraph>
  }, null)
}

const VMultislot = ({dir, list, onPrepend, onAppend, onUpdate, onRemove, render})=>{
  return <parsegraph dir={dir} type="u" pull="f" onClick={onPrepend}>
  {[...list].reverse().reduce((children, item, index)=>(
    <parsegraph dir="d" type="u" pull="f" onClick={()=>{
      onRemove(list.length - 1 - index);
    }}>
      {render ? render(item, list.length - 1 - index) : <Slot dir="f" value={item} setValue={(newVal)=>{
        onUpdate(list.length - 1 - index, newVal);
      }}/>}
      {children}
      {index === 0 ? <parsegraph dir='d' type='u' onClick={onAppend}/> : null}
    </parsegraph>
  ), null)}
  </parsegraph>
}

const CellLineContent = ({cellLine, dir})=>{
  return cellLine.reverse().reduce((cellChildren, child, indexReversed)=>{
    const index = cellLine.length - 1 - indexReversed;
    return <Cell dir={index == 0 ? dir : 'f'} cell={child}>{cellChildren}</Cell>
  }, null)
}

const CellLine = ({dir, cellLine, children})=>{
  if (!cellLine || cellLine.length === 0) {
    return children;
  }
  return <parsegraph dir={dir} type='s'>
    <CellLineContent dir='i' cellLine={cellLine}/>
    {children}
  </parsegraph>
}

const ObjectCell = ({dir, scale, value})=>{
  const keys = Object.keys(value)
  return <parsegraph scale={scale} dir={dir} type='s'>
    {keys.reverse().reduce((cellChildren, key, index)=>{
      return <parsegraph dir={index === keys.length - 1 ? 'i' : 'd'} type='u'>
        <parsegraph dir='b' label={key}/>
        <Cell dir='f' value={value[key]}/>
        {cellChildren}
      </parsegraph>
    }, null)}
  </parsegraph>
}

const ArrayCell = ({dir, scale, value})=>{
  const keys = Object.keys(value)
  return <parsegraph scale={scale} dir={dir} type='s'>
    {keys.reverse().reduce((cellChildren, key, index)=>{
      return <parsegraph dir={index === keys.length - 1 ? 'i' : 'd'} type='u'>
        <Cell dir='f' value={value[key]}/>
        {cellChildren}
      </parsegraph>
    }, null)}
  </parsegraph>
}

const Cell = (props)=>{
  const {value, scale, dir} = props;
  switch(typeof value) {
    case "object":
      if (Array.isArray(value)) {
        return <ArrayCell {...props}/>
      }
      return <ObjectCell {...props}/>
    case "bigint":
    case "number":
    case undefined:
    case null:
    case "boolean":
      return <parsegraph scale={scale} dir={dir} type='b' label={value}></parsegraph>
    case "string":
      return <parsegraph scale={scale} dir={dir} type='b' label={value}></parsegraph>
    default:
      return <parsegraph scale={scale} dir={dir} type='s' label={typeof value}></parsegraph>
  }
}

const Page = ({name, content})=>{
  const value = JSON.parse(content.toString());
  return <parsegraph type='b' label={name}>
    <Cell dir='f' value={value}/>
  </parsegraph>
}

module.exports = {
  default: (props) => {
    return <Page {...props}/>
  }
}