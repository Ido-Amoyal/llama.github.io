const svg = document.querySelector('svg.squiggle')
const path = svg.querySelector('path')

const scroll = () => {
  const distance = window.scrollY
  const totalDistance = svg.clientHeight - window.innerHeight

  const percentage = distance / totalDistance

  const pathLength = path.getTotalLength()

  path.style.strokeDasharray = `${pathLength}`
  path.style.strokeDashoffset = `${pathLength * (1 - percentage)}`
}

scroll()
window.addEventListener('scroll', scroll)
