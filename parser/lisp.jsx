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
  return <parsegraph dir={dir} type="b" label={value} onClick={()=>{
    setEditing(!editing);
  }}>
    {editing && typeof value === "number" && <parsegraph type="u" dir="f" label="+" onClick={()=>setValue(value + 1)}/>}
    {editing && typeof value === "number" && <parsegraph type="u" dir="b" label="-" onClick={()=>setValue(value - 1)}/>}
  </parsegraph>
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

const CellLineContent = ({subPath, cellLine, dir})=>{
  return cellLine.reverse().reduce((cellChildren, child, indexReversed)=>{
    const index = cellLine.length - 1 - indexReversed;
    return <Cell subPath={subPath} dir={index == 0 ? dir : 'f'} cell={child}>{cellChildren}</Cell>
  }, null)
}

const CellLine = ({subPath, dir, cellLine, children})=>{
  if (!cellLine || cellLine.length === 0) {
    return children;
  }
  return <parsegraph dir={dir} type='s'>
    <CellLineContent subPath={subPath} dir='i' cellLine={cellLine}/>
    {children}
  </parsegraph>
}

const Cell = ({subPath, dir, cell, children, scale})=>{
  //Symbol = 0,
  //Number = 1,
  //List = 2,
  //Proc = 3,
  //Lambda = 4

  if (!cell) {
    return null;
  }
  if (cell.type == 2) {
    const cellLines = 
    [...cell.list].reduce((lines, child)=>{
      if (child.newLined) {
        lines.push([])
      }
      const curLine = lines[lines.length - 1]
      curLine.push(child)
      return lines;
    }, [[]])

    if (cellLines.length === 1) {
      return <CellLine subPath={subPath} dir={dir} cellLine={cellLines[0]}>
        {children}
      </CellLine>
    }

    const firstLine = cellLines.shift();
    const firstCell = firstLine.shift();

    return <parsegraph dir={dir} type='s' scale={scale}><Cell subPath={subPath} dir='i' cell={firstCell}>
      {cellLines.reverse().reduce((cellChildren, cellLine, index)=>{
        return <parsegraph type='u' dir='d' shrink={index === 0}>
            <CellLineContent subPath={subPath} cellLine={cellLine}/>
            {cellChildren}
          </parsegraph>
      }, null)}
      <CellLineContent subPath={subPath} dir='f' cellLine={firstLine}/>
      {children}
    </Cell>
    </parsegraph>
  }
  return <parsegraph textSplice={cell.offset && cell.len ? {offset:cell.offset() - 1, len:cell.len(), subPath} : null} scale={scale} dir={dir} type='b' label={cell.val}>{children}</parsegraph>
}

const Page = ({name, content})=>{
  let children;
  try {
    const tokens = tokenize('(' + content + ')')
    children = parseTokens(tokens);
  } catch (ex) {
    children = {list: [{val: ex.toString(), type: 0}]}
  }
  return <parsegraph type='b' label={name}>
    <VMultislot dir='d' list={children.list} render={(child)=>{
      return <Cell subPath={name} dir='f' cell={child}/>
    }}/>
  </parsegraph>
}

module.exports = {
  default: (props) => {
    return <Page {...props}/>
  }
}
