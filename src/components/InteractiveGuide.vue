<script setup>
import {
  ref,
  computed,
  nextTick,
  onMounted,
  onBeforeUnmount
} from 'vue'

const emit = defineEmits([
  'close',
  'finished',
  'undo-action'
])

const currentStep = ref(0)
const targetRect = ref(null)
const stepCompleted = ref(false)

const steps = [
  {
    selector: '#inputsToggleBtn',
    title: 'Open the inputs',
    action: 'click',
    completed: () => {
      const button =
        document.querySelector('#inputsToggleBtn')

      return button?.getAttribute(
        'aria-expanded'
      ) === 'true'
    },

    undoAction: 'close-inputs'
  },

  {
    selector: '#input-selector',
    title: 'Choose what you want to play',
    action: 'change',

    completed: () => {
      const selector =
        document.querySelector(
          '#input-selector'
        )

      return selector?.value === 'Playlist'
    },

    undoAction: 'show-single-input'
  },

  {
    selector: '#input-selector',
    title: 'Switch back to Song',
    action: 'change',

    completed: () => {
      const selector =
        document.querySelector(
          '#input-selector'
        )

      return selector?.value === 'Single'
    },

    undoAction: 'show-playlist-input'
  },

  {
    selector: '#singleinputdiv',
    title: 'Enter a song url',
    action: 'input',

    completed: () => {
      const inputs =
        document.querySelectorAll(
          '#singleinputdiv input'
        )

      const urlInput = inputs[2]

      return !!urlInput?.value?.trim()
    },

    undoAction: 'clear-song-input'
  },

  {
    selector: '#guidePlayButton',
    title: 'Play the song',
    action: 'click',
    completeOnAction: true,
    completed: () => false,

    undoAction: 'stop-and-clear'
  },

    {
      selector: '.playlist-toggle',
      title: 'Open Up Next',
      action: 'click',

      completed: () => {
        const panel =
          document.querySelector(
            '.playlist-panel'
          )

        return panel?.classList.contains('open')
      },

        undoAction: 'close-playlist'
    },

  {
    selector: '.playlist-search',
    title: 'Search your queue',
    action: 'input',

    completed: () => {
      const input =
        document.querySelector(
          '.playlist-search'
        )

      return !!input?.value?.trim()
    },

    undoAction: 'clear-playlist-search'
  },

    {
    selector: '.playlist-toggle',
    title: 'Close Up Next',
    action: 'click',

    completed: () => {
      const panel =
        document.querySelector(
          '.playlist-panel'
        )

      return !panel?.classList.contains('close')
    },

      undoAction: 'open-playlist'
  },

  {
    selector: '.speed-control select',

    title: 'Change playback speed',

    action: 'change',

    completed: () => {

      const select = document.querySelector(
        '.speed-control select'
      )

      return Number(select?.value) !== 1

    },

    undoAction: 'reset-playback-speed'
  },

  {
    selector: '#guideLoopButton',

    title: 'Toggle loop',

    action: 'click',

    completeOnAction: true,

    completed: () => false,

    undoAction: 'toggle-loop-off'
  },

  {
    selector: '#guideShuffleButton',

    title: 'Toggle shuffle',

    action: 'click',

    completeOnAction: true,

    completed: () => false,

    undoAction: 'toggle-shuffle-off'
  },

  {
    selector: '#newvolumeslider',

    title: 'Adjust the volume',

    action: 'input',

    completed: () => {

      const slider = document.querySelector(
        '#newvolumeslider'
      )

      return Number(slider?.value) !== 50

    },

    undoAction: 'reset-volume'
  },

  {
    selector: '#guideMuteButton',

    title: 'Mute or unmute',

    action: 'click',

    completeOnAction: true,

    completed: () => false,

    undoAction: 'reset-mute'
  }
]

const step = computed(() => {
  return steps[currentStep.value]
})

const isFirstStep = computed(() => {
  return currentStep.value === 0
})

const isLastStep = computed(() => {
  return currentStep.value === steps.length - 1
})

const updateTarget = () => {
  const element =
    document.querySelector(step.value.selector)

  if (!element) {
    targetRect.value = null
    return
  }

  element.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
    inline: 'center'
  })

  setTimeout(() => {
    const rect =
      element.getBoundingClientRect()

    targetRect.value = {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height
    }
  }, 400)
}

const checkCompletion = () => {
  try {
    stepCompleted.value =
      step.value.completed()
  } catch {
    stepCompleted.value = false
  }
}

let autoNextTimeout = null
let completionCheckInterval = null

const stopCompletionCheck = () => {
  if (completionCheckInterval) {
    clearInterval(completionCheckInterval)
    completionCheckInterval = null
  }
}

const completeCurrentStep = () => {
  if (stepCompleted.value) return

  stepCompleted.value = true

  stopCompletionCheck()

  clearTimeout(autoNextTimeout)

  autoNextTimeout = setTimeout(() => {
    if (stepCompleted.value) {
      nextStep()
    }
  }, 700)
}

const handleUserAction = () => {
  if (step.value.completeOnAction) {
    stepCompleted.value = true

    updateTarget()

    clearTimeout(autoNextTimeout)

    autoNextTimeout = setTimeout(() => {
      if (stepCompleted.value) {
        nextStep()
      }
    }, 700)

    return
  }

  stopCompletionCheck()

  let attempts = 0
  const maxAttempts = 100

  completionCheckInterval = setInterval(() => {
    attempts++

    checkCompletion()

    updateTarget()

    if (stepCompleted.value) {
      stopCompletionCheck()

      clearTimeout(autoNextTimeout)

      autoNextTimeout = setTimeout(() => {
        if (stepCompleted.value) {
          nextStep()
        }
      }, 700)

      return
    }

    if (attempts >= maxAttempts) {
      stopCompletionCheck()
    }
  }, 100)
}

const addStepListener = () => {
  const element =
    document.querySelector(step.value.selector)

  if (!element) return

  element.addEventListener(
    step.value.action,
    handleUserAction
  )
}

const removeStepListener = () => {
  const element =
    document.querySelector(step.value.selector)

  if (!element) return

  element.removeEventListener(
    step.value.action,
    handleUserAction
  )
}

const loadStep = async () => {
  stepCompleted.value = false

  await nextTick()

  setTimeout(() => {
    updateTarget()
    checkCompletion()
    addStepListener()
  }, 300)
}

const nextStep = async () => {
  if (!stepCompleted.value) return

  clearTimeout(autoNextTimeout)

  stopCompletionCheck()

  removeStepListener()

  if (isLastStep.value) {
    finishGuide()
    return
  }

  currentStep.value++

  await loadStep()
}

const previousStep = async () => {
  if (isFirstStep.value) return

  clearTimeout(autoNextTimeout)
  stopCompletionCheck()
  removeStepListener()

  // Move back first
  currentStep.value--

  // Undo the action belonging to the step we are returning to
  const undoAction = steps[currentStep.value].undoAction

  if (undoAction) {
    emit('undo-action', undoAction)
  }

  await nextTick()
  await loadStep()
}

const finishGuide = () => {
  clearTimeout(autoNextTimeout)

  stopCompletionCheck()

  removeStepListener()

  emit('finished')
}

const closeGuide = () => {
  clearTimeout(autoNextTimeout)

  stopCompletionCheck()

  removeStepListener()

  emit('close')
}

const highlightStyle = computed(() => {
  if (!targetRect.value) {
    return {
      display: 'none'
    }
  }

  const rect = targetRect.value

  return {
    top: `${rect.top - 6}px`,
    left: `${rect.left - 6}px`,
    width: `${rect.width + 12}px`,
    height: `${rect.height + 12}px`
  }
})

const targetIsOnRight = computed(() => {

  if (!targetRect.value) return false

  const rect = targetRect.value

  return (
    rect.left + rect.width / 2 >
    window.innerWidth / 2
  )

})

const arrowStyle = computed(() => {

  if (!targetRect.value) {

    return {
      display: 'none'
    }

  }

  const rect = targetRect.value

  const arrowSize = 45
  const gap = 18

  const top = Math.max(
    arrowSize,
    Math.min(
      window.innerHeight - arrowSize,
      rect.top + rect.height / 2
    )
  )

  let left

  if (targetIsOnRight.value) {

    left =
      rect.left - gap

  } else {

    left =
      rect.left +
      rect.width +
      gap

  }

  left = Math.max(
    arrowSize,
    Math.min(
      window.innerWidth - arrowSize,
      left
    )
  )

  return {

    top: `${top}px`,

    left: `${left}px`

  }

})

const tooltipStyle = computed(() => {

  if (!targetRect.value) {

    return {

      top: '50%',

      left: '50%',

      transform:
        'translate(-50%, -50%)'

    }

  }

  const rect = targetRect.value

  const margin = 15
  const gap = 30

  const tooltipWidth = Math.min(
    window.innerWidth * 0.9,
    380
  )

  const tooltipHeight = 300

  const viewportWidth =
    window.innerWidth

  const viewportHeight =
    window.innerHeight

  const candidates = [

    {
      top:
        rect.top +
        rect.height / 2,

      left:
        rect.left +
        rect.width +
        gap,

      transform:
        'translateY(-50%)',

      fits: () => {

        return (

          rect.left +
          rect.width +
          gap +
          tooltipWidth <=
          viewportWidth -
          margin

        )

      }

    },

    {
      top:
        rect.top +
        rect.height / 2,

      left:
        rect.left -
        gap,

      transform:
        'translate(-100%, -50%)',

      fits: () => {

        return (

          rect.left -
          gap -
          tooltipWidth >=
          margin

        )

      }

    },

    {
      top:
        rect.top +
        rect.height +
        gap,

      left:
        rect.left +
        rect.width / 2,

      transform:
        'translateX(-50%)',

      fits: () => {

        return (

          rect.top +
          rect.height +
          gap +
          tooltipHeight <=
          viewportHeight -
          margin

        )

      }

    },

    {
      top:
        rect.top -
        gap,

      left:
        rect.left +
        rect.width / 2,

      transform:
        'translate(-50%, -100%)',

      fits: () => {

        return (

          rect.top -
          gap -
          tooltipHeight >=
          margin

        )

      }

    }

  ]

  let orderedCandidates

  if (targetIsOnRight.value) {

    orderedCandidates = [

      candidates[1],
      candidates[3],
      candidates[2],
      candidates[0]

    ]

  } else {

    orderedCandidates = [

      candidates[0],
      candidates[3],
      candidates[2],
      candidates[1]

    ]

  }

  let position =
    orderedCandidates.find(
      candidate =>
        candidate.fits()
    )

  if (!position) {

    position =
      orderedCandidates[0]

  }

  let top =
    position.top

  let left =
    position.left

  if (
    position.transform.includes(
      'translateY'
    )
  ) {

    top = Math.max(
      tooltipHeight / 2 + margin,
      Math.min(
        viewportHeight -
        tooltipHeight / 2 -
        margin,
        top
      )
    )

  }

  if (
    position.transform.includes(
      'translateX'
    ) ||
    position.transform.includes(
      'translate(-50%'
    )
  ) {

    left = Math.max(
      tooltipWidth / 2 + margin,
      Math.min(
        viewportWidth -
        tooltipWidth / 2 -
        margin,
        left
      )
    )

  }

  if (
    position.transform ===
    'translate(-100%, -50%)'
  ) {

    left = Math.max(
      tooltipWidth + margin,
      left
    )

    top = Math.max(
      tooltipHeight / 2 + margin,
      Math.min(
        viewportHeight -
        tooltipHeight / 2 -
        margin,
        top
      )
    )

  }

  if (
    position.transform ===
    'translateY(-50%)'
  ) {

    left = Math.min(
      viewportWidth -
      tooltipWidth -
      margin,
      left
    )

    top = Math.max(
      tooltipHeight / 2 + margin,
      Math.min(
        viewportHeight -
        tooltipHeight / 2 -
        margin,
        top
      )
    )

  }

  return {

    top: `${top}px`,

    left: `${left}px`,

    transform:
      position.transform

  }

})

const handleResize = () => {
  updateTarget()
}

onMounted(() => {
  loadStep()

  window.addEventListener(
    'resize',
    handleResize
  )

  window.addEventListener(
    'scroll',
    handleResize,
    true
  )
})

onBeforeUnmount(() => {
  removeStepListener()

  clearTimeout(autoNextTimeout)

  stopCompletionCheck()

  window.removeEventListener(
    'resize',
    handleResize
  )

  window.removeEventListener(
    'scroll',
    handleResize,
    true
  )
})
</script>

<template>
  <div class="guide-overlay">

    <!-- Highlight -->

    <div
      class="guide-highlight"
      :style="highlightStyle"
    />

    <!-- Arrow -->

    <div
      class="guide-arrow"
      :class="{
        'arrow-point-left': targetIsOnRight,
        'arrow-point-right': !targetIsOnRight
      }"
      :style="arrowStyle"
    >
      ➜
    </div>

    <!-- Tutorial box -->

    <div
      class="guide-tooltip"
      :style="tooltipStyle"
    >
      <div class="guide-progress">
        Step {{ currentStep + 1 }}
        of {{ steps.length }}
      </div>

      <h3>
        {{ step.title }}
      </h3>

      <p>
        {{ step.text }}
      </p>

      <div
        v-if="stepCompleted"
        class="guide-completed"
      >
        ✓ Step completed
      </div>

      <div
        v-else
        class="guide-waiting"
      >
        Complete the action to continue
      </div>

      <div class="guide-buttons">

        <button
          v-if="!isFirstStep"
          class="guide-back-button"
          @click="previousStep"
        >
          ← Back
        </button>

        <button
          class="guide-skip-button"
          @click="closeGuide"
        >
          Skip guide
        </button>

        <button
          class="guide-next-button"
          :disabled="!stepCompleted"
          @click="nextStep"
        >
          {{ isLastStep ? 'Finish' : 'Next →' }}
        </button>

      </div>
    </div>

  </div>
</template>

<style scoped>
.guide-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  pointer-events: none;
}

.guide-highlight {
  position: fixed;
  z-index: 100000;
  border: 2px solid rgba(255, 255, 255, 0.95);
  border-radius: 14px;
  box-shadow:
    0 0 0 9999px rgba(8, 12, 20, 0.68),
    0 0 0 5px rgba(255, 255, 255, 0.08),
    0 0 30px rgba(255, 255, 255, 0.35);
  pointer-events: none;
  transition:
    top 0.35s cubic-bezier(.22, 1, .36, 1),
    left 0.35s cubic-bezier(.22, 1, .36, 1),
    width 0.35s cubic-bezier(.22, 1, .36, 1),
    height 0.35s cubic-bezier(.22, 1, .36, 1);
  animation: guide-highlight-pulse 2s ease-in-out infinite;
}

@keyframes guide-highlight-pulse {
  0%,
  100% {
    box-shadow:
      0 0 0 9999px rgba(8, 12, 20, 0.68),
      0 0 0 5px rgba(255, 255, 255, 0.08),
      0 0 22px rgba(255, 255, 255, 0.25);
  }

  50% {
    box-shadow:
      0 0 0 9999px rgba(8, 12, 20, 0.68),
      0 0 0 7px rgba(255, 255, 255, 0.12),
      0 0 38px rgba(255, 255, 255, 0.45);
  }
}

.guide-arrow {
  position: fixed;
  z-index: 100001;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 54px;
  font-size: 42px;
  font-weight: bold;
  color: white;
  pointer-events: none;
  line-height: 1;
  filter: drop-shadow(0 5px 12px rgba(0, 0, 0, 0.45));
  animation: guide-arrow-animation 0.9s ease-in-out infinite alternate;
}

.arrow-point-left {
  transform: translate(-100%, -50%);
}

.arrow-point-right {
  transform: translate(0, -50%) rotate(180deg);
}

@keyframes guide-arrow-animation {
  from {
    margin-left: -5px;
  }

  to {
    margin-left: 7px;
  }
}

.guide-tooltip {
  position: fixed;
  z-index: 100002;
  width: min(92vw, 400px);
  max-height: calc(100vh - 30px);
  overflow-y: auto;
  box-sizing: border-box;
  padding: 24px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.96);
  color: #15171c;
  border: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 25px 70px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  pointer-events: auto;
  animation: guide-popup-in 0.35s cubic-bezier(.22, 1, .36, 1);
}

@keyframes guide-popup-in {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.97);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.guide-progress {
  display: inline-flex;
  align-items: center;
  padding: 6px 11px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.07);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(0, 0, 0, 0.55);
}

.guide-tooltip h3 {
  margin: 16px 0 10px;
  font-size: 24px;
  font-weight: 750;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.guide-tooltip p {
  margin: 0;
  color: rgba(20, 22, 28, 0.68);
  font-size: 15px;
  line-height: 1.6;
  white-space: pre-line;
}

.guide-completed,
.guide-waiting {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 20px;
  padding: 12px 14px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
}

.guide-completed {
  background: rgba(34, 163, 90, 0.1);
  color: #15803d;
  border: 1px solid rgba(34, 163, 90, 0.18);
}

.guide-waiting {
  background: rgba(0, 0, 0, 0.045);
  color: rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.guide-buttons {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 24px;
  padding-top: 18px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.guide-buttons button {
  border: none;
  border-radius: 11px;
  padding: 11px 16px;
  font-size: 14px;
  font-weight: 650;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    background 0.18s ease,
    opacity 0.18s ease;
}

.guide-buttons button:hover:not(:disabled) {
  transform: translateY(-1px);
}

.guide-buttons button:active:not(:disabled) {
  transform: translateY(0);
}

.guide-back-button {
  background: rgba(0, 0, 0, 0.07);
  color: #333;
}

.guide-back-button:hover {
  background: rgba(0, 0, 0, 0.12);
}

.guide-skip-button {
  margin-right: auto;
  background: transparent;
  color: rgba(0, 0, 0, 0.5);
}

.guide-skip-button:hover {
  background: rgba(0, 0, 0, 0.05);
  color: rgba(0, 0, 0, 0.8);
}

.guide-next-button {
  background: #15171c;
  color: white;
  box-shadow: 0 5px 15px rgba(21, 23, 28, 0.22);
}

.guide-next-button:hover:not(:disabled) {
  background: #292d36;
  box-shadow: 0 8px 22px rgba(21, 23, 28, 0.3);
}

.guide-next-button:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  box-shadow: none;
}

.dark-mode .guide-tooltip {
  background: rgba(28, 30, 36, 0.96);
  color: #f5f5f7;
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 25px 70px rgba(0, 0, 0, 0.6);
}

.dark-mode .guide-progress {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.6);
}

.dark-mode .guide-tooltip p {
  color: rgba(255, 255, 255, 0.65);
}

.dark-mode .guide-waiting {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.55);
  border-color: rgba(255, 255, 255, 0.08);
}

.dark-mode .guide-completed {
  background: rgba(34, 163, 90, 0.15);
  color: #5eea91;
}

.dark-mode .guide-buttons {
  border-color: rgba(255, 255, 255, 0.08);
}

.dark-mode .guide-back-button {
  background: rgba(255, 255, 255, 0.08);
  color: white;
}

.dark-mode .guide-back-button:hover {
  background: rgba(255, 255, 255, 0.14);
}

.dark-mode .guide-skip-button {
  color: rgba(255, 255, 255, 0.5);
}

.dark-mode .guide-skip-button:hover {
  background: rgba(255, 255, 255, 0.06);
  color: white;
}

.dark-mode .guide-next-button {
  background: white;
  color: #15171c;
}
</style>